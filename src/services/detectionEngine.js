// const BaseLine = require("../models/baseline");
// const PoleReading = require("../models/pole_reading");


// const recentCache = {};


// function getMovingAverage(arr){
//     if(arr.length === 0 || !arr) return 0;
//     const sum = arr.reduce((a,b) => a + b, 0);
//     return sum / arr.length;
// }

// function updateCache(pole_id , current){
//     if(!recentCache[pole_id]){
//         recentCache[pole_id] = [];
//     }
//     recentCache[pole_id].push(current);
//     if(recentCache[pole_id].length > 10){
//         recentCache[pole_id].shift();
//     }
// }

// async function detect(reading){
//     const { pole_id , current , voltage, power } = reading;

//     updateCache(pole_id , current);

//     const history = recentCache[pole_id];
//     const movingaverage = getMovingAverage(history);

//     const hour = new Date().getHours().toString().padStart(2,"0") + ":00";

//     const baseline = await BaseLine.findOne({
//         pole_id,
//         time_slot: hour
//     });

//     if(!baseline){
//        return { status: "baseline not found" };
//     }

//     const expected = baseline.avg_current;
//     const stdev = baseline.stdev_current || 0;

//     // calculation 
//     const threshold = expected * 1.3;
//     const z_score = (current - expected) / stdev;

//     const prev = history[history.length - 2] || current;
//     const spike = current - prev;

//     const voltagedrops = voltage < 220;

//     const high_current = current > threshold;
//     const above_movAverage = current > movingaverage * 1.2;
//     const high_z = z_score > 3;
//     const spike_flag = spike > expected * 0.5;

//     let score = 0;
//     if(high_current) score += 30;
//     if(above_movAverage) score += 20;
//     if(high_z) score += 30;
//     if(spike_flag) score += 10;
//     if(voltagedrops) score += 10;

//     let status = "NORMAL";
//     if(score > 70) status = "HIGH RISK";
//     else if(score > 40) status = "MEDIUM RISK";

//     if(status !== "NORMAL"){
//         console.log("Anomaly detected for pole " , pole_id , "with socore" , score);
//     }

// }

// module.exports = detect;

// const BaseLine = require("../models/baseline");
// const PoleReading = require("../models/pole_reading");

// // In-memory cache for recent readings
// const recentCache = {};

// // ----------------------
// // Utility Functions
// // ----------------------

// function getMovingAverage(arr) {
//     if (!arr || arr.length === 0) return 0;
//     const sum = arr.reduce((a, b) => a + b, 0);
//     return sum / arr.length;
// }

// function updateCache(pole_id, current) {
//     if (!recentCache[pole_id]) {
//         recentCache[pole_id] = [];
//     }

//     recentCache[pole_id].push(current);

//     // Keep only last 10 values
//     if (recentCache[pole_id].length > 10) {
//         recentCache[pole_id].shift();
//     }
// }

// // ----------------------
// // Baseline Builder (1hr)
// // ----------------------

// async function buildBaseline(pole_id, time_slot) {
//     const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

//     const readings = await PoleReading.find({
//         pole_id,
//         time_stamp: { $gte: oneHourAgo }
//     });

//     // Not enough data
//     if (readings.length < 5) {
//         return null;
//     }

//     let total = 0;
//     const values = [];

//     readings.forEach(r => {
//         total += r.current;
//         values.push(r.current);
//     });

//     const avg = total / readings.length;

//     // Standard deviation
//     const variance = values.reduce((sum, val) => {
//         return sum + Math.pow(val - avg, 2);
//     }, 0) / values.length;

//     const stdev = Math.sqrt(variance);

//     const baseline = await BaseLine.findOneAndUpdate(
//         { pole_id, time_slot },
//         {
//             pole_id,
//             time_slot,
//             avg_current: avg,
//             stdev_current: stdev,
//             updated_at: new Date()
//         },
//         { upsert: true, new: true }
//     );

//     return baseline;
// }

// // ----------------------
// // Detection Engine
// // ----------------------

// async function detect(reading) {
//     const { pole_id, current, voltage } = reading;

//     // Update cache
//     updateCache(pole_id, current);

//     const history = recentCache[pole_id];
//     const movingAverage = getMovingAverage(history);

//     // Time slot (hour based)
//     const hour = new Date().getHours().toString().padStart(2, "0") + ":00";

//     // Fetch baseline
//     let baseline = await BaseLine.findOne({
//         pole_id,
//         time_slot: hour
//     });

//     // If baseline not found → build it
//     if (!baseline) {
//         baseline = await buildBaseline(pole_id, hour);

//         if (!baseline) {
//             return { status: "collecting data for baseline" };
//         }

//         return {
//             status: "baseline created",
//             baseline
//         };
//     }

//     const expected = baseline.avg_current;
//     const stdev = baseline.stdev_current || 0;

//     // ----------------------
//     // Detection Logic
//     // ----------------------

//     const threshold = expected * 1.3;
//     const z_score = stdev === 0 ? 0 : (current - expected) / stdev;

//     const prev = history[history.length - 2] || current;
//     const spike = current - prev;

//     const voltageDrop = voltage < 210;

//     const high_current = current > threshold;
//     const above_movingAverage = current > movingAverage * 1.2;
//     const high_z = z_score > 3;
//     const spike_flag = spike > expected * 0.5;

//     let score = 0;

//     if (high_current) score += 30;
//     if (above_movingAverage) score += 20;
//     if (high_z) score += 30;
//     if (spike_flag) score += 10;
//     if (voltageDrop) score += 10;

//     let status = "NORMAL";

//     if (score > 70) status = "HIGH RISK";
//     else if (score > 40) status = "MEDIUM RISK";

//     if (status !== "NORMAL") {
//         console.log(
//             "⚠️ Anomaly detected for pole",
//             pole_id,
//             "| Score:",
//             score
//         );
//     }

//     // Final response
//     return {
//         status,
//         score,
//         metrics: {
//             expected,
//             current,
//             movingAverage,
//             z_score,
//             spike,
//             voltage
//         },
//         flags: {
//             high_current,
//             above_movingAverage,
//             high_z,
//             spike_flag,
//             voltageDrop
//         }
//     };
// }

// module.exports = detect;

// ------------------------------------ Engine - 2 ----------------------------


const BaseLine = require("../models/baseline");
const History = require("../models/pole_reading_history");
const triggerAlert = require("./alertService");

// In-memory cache (we'll improve later)
const recentCache = {};
const lastAlertTime = {};



function getMovingAverage(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function updateCache(pole_id, current) {
    if (!recentCache[pole_id]) {
        recentCache[pole_id] = [];
    }

    recentCache[pole_id].push(current);

    if (recentCache[pole_id].length > 10) {
        recentCache[pole_id].shift();
    }
}

// ----------------------
// Baseline Builder (FIXED)
// ----------------------

async function buildBaseline(pole_id, time_slot) {
    //const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const readings = await History.find({
        pole_id,
        time_stamp: { $gte: oneMinuteAgo } // here OneMinuteAgo
    });

    if (readings.length < 5) { // < 5
        return null;
    }

    const values = readings.map(r => r.current);

    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    const variance = values.reduce((sum, val) => {
        return sum + Math.pow(val - avg, 2);
    }, 0) / values.length;

    const stdev = Math.sqrt(variance);

    return await BaseLine.findOneAndUpdate(
        { pole_id, time_slot },
        {
            avg_current: avg,
            stdev_current: stdev,
            updated_at: new Date()
        },
        { upsert: true, returnDocument: "after" }
    );
}

// ----------------------
// Detection Engine V2
// ----------------------

async function detect(reading,io) {
    const { pole_id, current, voltage } = reading;

    updateCache(pole_id, current);
    const history = recentCache[pole_id];
    const movingAverage = getMovingAverage(history);

    //const hour = new Date().getHours().toString().padStart(2, "0") + ":00";

    //testing minute code
    const now = new Date();
    const istTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const minuteSlot = istTime.getHours().toString().padStart(2,"0") + ":" + istTime.getMinutes().toString().padStart(2,"0");

    let baseline = await BaseLine.findOne({ pole_id, time_slot: minuteSlot });  // <--- minute slot

    if (!baseline) {
        baseline = await buildBaseline(pole_id, minuteSlot); // <-- minute slot

        if (!baseline) {
            return { status: "collecting data" };
        }
    }
    io.emit("baseline-update", {
        pole_id,
        time_slot: baseline.time_slot,
        expected_current: baseline.avg_current,
        expected_voltage: baseline.avg_voltage,
        stdev_current: baseline.stdev_current
    });

    const expected = baseline.avg_current;
    const stdev = baseline.stdev_current || 1;

    // ----------------------
    // Improved Logic
    // ----------------------

    const z_score = (current - expected) / stdev;
    const threshold = expected + (2 * stdev);

    const prev = history[history.length - 2] || current;

    const high_current = current > threshold;
    const high_z = z_score > 2.5;
    const spike_flag = Math.abs(current - prev) > (2 * stdev);
    const above_movingAverage = current > movingAverage * 1.2;

    let score = 0;

    score += Math.min(40, Math.max(0, z_score * 10));
    if (high_current) score += 20;
    if (spike_flag) score += 20;
    if (above_movingAverage) score += 10;

    let status = "NORMAL";

    if (score > 70) status = "HIGH RISK";
    else if (score > 40) status = "MEDIUM RISK";

    // ----------------------
    // Cooldown (IMPORTANT)
    // ----------------------

    // if (status !== "NORMAL") {
    //     const now = Date.now();

    //     if (
    //         !lastAlertTime[pole_id] ||
    //         now - lastAlertTime[pole_id] > 60000
    //     ) {
    //         console.log("⚠️ ALERT:", pole_id, "| Score:", score);
    //         lastAlertTime[pole_id] = now;
    //     }
    // }

    await triggerAlert({ pole_id, status, score });

    return {
        status,
        score,
        metrics: {
            expected,
            current,
            movingAverage,
            z_score
        }
    };
}

module.exports = detect;