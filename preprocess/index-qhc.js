/*jshint node:true */
"use strict";

var fs = require('fs');
var program = require('commander');
// requiremetns for mongoDB
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

var url = 'mongodb://localhost:27017/bikeproject?socketTimeoutMS=90000';
var inputCollection = 'halts';

var input = '';
var output = {
    'districts': []
};


// https://zackehh.com/handling-synchronous-asynchronous-loops-javascriptnode-js/
function syncLoop(iterations, process, exit){
    var index = 0,
        done = false,
        shouldExit = false;
    var loop = {
        next:function(){
            if(done){
                if(shouldExit && exit){
                    return exit(); // Exit if we're done
                }
            }
            // If we're not finished
            if(index < iterations){
                index++; // Increment our index
                process(loop); // Run our process, pass in the loop
            // Otherwise we're done
            } else {
                done = true; // Make sure we say we're done
                if(exit) exit(); // Call the callback on exit
            }
        },
        iteration:function(){
            return index - 1; // Return the loop number we're on
        },
        break:function(end){
            done = true; // End the loop
            shouldExit = end; // Passing end as true means we still call the exit callback
        }
    };
    loop.next();
    return loop;
}


process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', function (chunk) {
  input = input + chunk;
});

process.stdin.on('end', function() {
    var json,
        featuresCount,
        features;

    json = JSON.parse(input);

    features = json.features;
    featuresCount = features.length;
    // console.log('process.stdin.on, featuresCount:', featuresCount);

    MongoClient.connect(url, function(err, db) {
        assert.equal(err, null);

        // // create map data for the bike with the bike_number 97252
        // createMapDataSets(db, 97252, function() {
        //     db.close();
        // } );

        // creare map data for all bikes
        createForAllFeatures(db, features, function(result) {
            db.close();

            var outputCount = output.districts.length;
            for (var i = 0; i < outputCount; i++) {
                var fileName = 'cartodb_id_' + output.districts[i].id + '.geojson';
                fs.writeFile( fileName,
                    JSON.stringify(output.districts[i].coordinates, null, '\t'),
                    function(err) {
                        if (err) {
                            console.log('ERROR: createForAllFeatures:', err);
                            return;
                         }

                });
            }

            console.log('createForAllFeatures, wrote files');
            // console.log(JSON.stringify(output, null, '\t'));
        });
    });
});

var createForAllFeatures = function(db, features, callback) {
    var length = features.length;

    // console.log('createForAllFeatures length: ', length);

    syncLoop(length, function(loop){
        // console.log('createForAllBikes loop.iteration: ', loop.iteration());
        // console.log('createForAllBikes bikeNumber: ', bikeNumbers[loop.iteration()]);
        createJson(db, features[loop.iteration()], function(result) {
            loop.next();
        } );
    }, function(){
        callback();
    });
};

var createJson = function(db, feature, callback) {
    if ( feature === null || feature === undefined ) {
        console.log('ERROR: createDistrictJson, feature:', feature);
        return;
    }
    // console.log('createDistrictJson, name: ', feature.properties.name);

    var collection = db.collection(inputCollection);
    collection.aggregate(
        [
            {
                $match: {
                    loc: {
                        $geoWithin: {
                            $geometry: {
                                type: "MultiPolygon",
                                coordinates: feature.geometry.coordinates
                            }
                        }
                   }
                }
            },
            {
                $project: {
                    bikeNumber: "$bikeNumber",
                    coordinates: "$loc.coordinates"
                    // year: { $year: "$startDate"},
                    // month: { $month: "$startDate" },
                    // day: { $dayOfMonth: "$startDate" },
                    // hour: { $hour: "$startDate" },
                    // week: { $isoWeek: "$startDate" },
                    // dayOfWeek: { $isoDayOfWeek: "$startDate" }
                }
            }
            // {
            //     $group: {
            //         _id: { year: "$year", month: "$month"},
            //         count: { $sum: 1 }
            //     }
            // },
            // {
            //     $sort : { "_id.year": 1, "_id.month": 1 }
            // }
        ],
        function(err, results) {
            assert.equal(err, null);
            // console.log('createDistrictJson, results: ', results);

            var districtData = {
                'name': feature.properties.name,
                'id': feature.properties.cartodb_id,
                "coordinates": []
            };

            var resultcount = results.length;
            for (var i = 0; i < resultcount; i++) {
                districtData.coordinates.push(results[i].coordinates);
            }

            output.districts.push(districtData);
            callback();
        }
    );
};
