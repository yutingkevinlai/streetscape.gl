import {VoyageConverter} from './converters';
import {XVIZWriter} from './xviz-writer';
import {createDir, deleteDirRecursive} from './parsers/common';
import {XVIZMetadataBuilder} from './xviz-writer';
import * as Topics from '~/topics';
import Bag from './lib/bag';

module.exports = async function main(args) {
  const {bag: bagPath, outputDir, disableStreams, frameLimit} = args;

  deleteDirRecursive(outputDir);
  createDir(outputDir);
  const converter = new VoyageConverter(disableStreams);
  const bag = new Bag({
    bagPath,
    keyTopic: Topics.CURRENT_POSE,
    topics: Topics.ALL
  });

  console.log(`Converting data at ${bagPath}`); // eslint-disable-line
  console.log(`Saving to ${outputDir}`); // eslint-disable-line

  // This abstracts the details of the filenames expected by our server
  const xvizWriter = new XVIZWriter();

  const profileStart = Date.now();
  let frameNum = 0;
  let startTime = null;
  let endTime = null;
  await bag.readFrames(async frame => {
    try {
      if (frameNum < frameLimit) {
        endTime = frame.keyTopic.timestamp.toDate();
        if (!startTime) {
          startTime = endTime;
        }

        const xvizFrame = await converter.convertFrame(frame);
        xvizWriter.writeFrame(outputDir, frameNum, xvizFrame);
        frameNum++;
      }
    }
    catch (err) {
      console.error(err);
    }
  });

  // Write metadata file
  const xb = new XVIZMetadataBuilder();
  xb.startTime(startTime.getTime()).endTime(endTime.getTime());
  converter.buildMetadata(xb);
  xvizWriter.writeMetadata(outputDir, xb.getMetadata());

  const profileEnd = Date.now();
  console.log(`Generate ${frameNum} frames in ${profileEnd - profileStart}s`); // eslint-disable-line
};