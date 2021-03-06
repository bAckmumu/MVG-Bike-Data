/**
 * MvgstateHaltParser
 *
 */

const HaltParser = require('./../share/HaltParser');

class MvgstateHaltParser extends HaltParser {
  constructor(outputFolder, tempFileName, dataFileName, provider) {
    super(outputFolder, tempFileName, dataFileName, provider);
  }

  processData(filename, json) {
    if (!json) {
      throw new Error('processData, json:', json);
    }

    const addedBikes = json.addedBikes;
    if (!addedBikes) {
      throw new Error('processData, addedBikes:', addedBikes);
    }

    addedBikes.forEach(function(addedBike) {
      const lastHalt = this.tempData.get(addedBike.bikeNumber);

      if (
        lastHalt &&
        lastHalt.longitude === addedBike.longitude &&
        lastHalt.latitude === addedBike.latitude
      ) {
        this.updateHalt({
          lastHalt: lastHalt,
          endDate: new Date(addedBike.updated)
        });
      } else {
        this.createHalt({
          bikeNumber: addedBike.bikeNumber,
          longitude: addedBike.longitude,
          latitude: addedBike.latitude,
          date: new Date(addedBike.updated),
          provider: this.provider,
          additionalData: [
            ['stationId', addedBike.currentStationID],
            // TODO standardize between mvg-networkstate
            //   addedBike.currentStationID
            //   addedStation.id
            //   addedStation.placeID
            //   addedStation.name
            // and nextbike-mvgrad
            //   place.uid
            //   place.name
            ['district', addedBike.district]
          ]
        });
      }
    }, this);
  }
}

module.exports = MvgstateHaltParser;
