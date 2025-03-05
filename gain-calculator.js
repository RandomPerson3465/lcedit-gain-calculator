const zCriticalValues = {
    "80": 1.28155156554,
    "90": 1.64485362695,
    "95": 1.95996398454,
    "98": 2.32634787404,
    "99": 2.57582930355
}

function update() {

    switch (gainType.value) {
        case "uniform":
            uniformGainSettings.style.display = "block";
            gaussianGainSettings.style.display = "none";
            customDistributionSettings.style.display = "none";
            break;
        case "gaussian":
            uniformGainSettings.style.display = "none";
            gaussianGainSettings.style.display = "block";
            customDistributionSettings.style.display = "none";
            break;
        case "custom":
            uniformGainSettings.style.display = "none";
            gaussianGainSettings.style.display = "none";
            customDistributionSettings.style.display = "block";
            break;
    }

    if (getNum(updateInterval) <= 0) return showError("Invalid update interval.");
    if (getNum(gainPer) <= 0) return showError("Invalid gain per time.");
    if (getNum(timeAfter) < 0) return showError("Invalid time.")

    let interval = getNum(updateInterval) * getNum(updateIntervalUnit);
    let intervalsPassed = getGivenTime() / interval;

    let avg, stdev;

    if (gainType.value === "uniform") {
        let min = getNum(minGain);
        let max = getNum(maxGain);
        avg = (min + max) / 2;
        stdev = Math.abs(max - min) / Math.sqrt(12);
    } else if (gainType.value === "gaussian") {
        avg = getNum(meanGain);
        stdev = Math.abs(getNum(stDevGain));
    } else if (gainType.value === "custom") {
        avg = 0;
        let dist = [];
        let variance = 0;
        for (const row of customGain.value.split("\n")) {
            split = row.replace(/ +/, "").split(",");
            if (split.length === 1 && split[0] === "") continue;
            dist.push(split.map(x => parseFloat(x)));
        }
        let totalWeight = 0;
        for (const row of dist) {
            if (row[2] < 0) return showError("Invalid custom distribution");
            totalWeight += row[2];
            avg += (row[0] + row[1]) * row[2];
        }
        avg /= (totalWeight + totalWeight);
        if (!isFinite(avg)) return showError("Invalid custom distribution");
        for (const row of dist) {
            let a = row[0], b = row[1];
            if (a === b) {
                variance += a * a * row[2] / totalWeight;
            } else {
                variance += (b * b * b - a * a * a) / 3 / (b - a) * row[2] / totalWeight;
            }
        }
        variance -= avg * avg;
        stdev = Math.sqrt(Math.max(0,variance));
        if (!isFinite(stdev)) return showError("Invalid custom distribution");
    }

    let multiplier = getNum(gainPerUnit) === -1 ? 1 / getNum(gainPer) : interval / (getNum(gainPer) * getNum(gainPerUnit));
    avg *= multiplier;
    stdev *= multiplier;
    let avgGain = avg * intervalsPassed;
    let stDevOfGain = stdev * Math.sqrt(intervalsPassed);
    meanOneInterval.innerHTML = formatNum(avg);
    stDevOneInterval.innerHTML = formatNum(stdev);
    numIntervalsPassed.innerHTML = formatNum(Math.round(intervalsPassed));
    document.querySelectorAll(".givenTime").forEach(x => x.innerHTML = formatGivenTime());
    meanAfter.innerHTML = formatNum(Math.round(avgGain));
    countAfter.innerHTML = formatNum(Math.round(getNum(count) + avgGain));
    stDevAfter.innerHTML = formatNum(stDevOfGain);

    warning.style.display = intervalsPassed < 30 && intervalsPassed !== 0 ? "block" : "none";

    zCriticalValue = zCriticalValues[confidenceLevel.value];
    lowerGainAfter.innerHTML = formatNum(Math.round(avgGain - zCriticalValue * stDevOfGain));
    upperGainAfter.innerHTML = formatNum(Math.round(avgGain + zCriticalValue * stDevOfGain));
    lowerCountAfter.innerHTML = formatNum(Math.round(getNum(count) + avgGain - zCriticalValue * stDevOfGain));
    upperCountAfter.innerHTML = formatNum(Math.round(getNum(count) + avgGain + zCriticalValue * stDevOfGain));

    showError();
    showResults();
}

function showError(err) {
    if (err) {
        error.innerHTML = err;
        error.style.display = "block";
        results.style.display = "none";
    } else {
        error.style.display = "none";
    }
}

function showResults() {
    results.style.display = "block";
}

function getNum(el) {
    return parseFloat(el.value) || 0;
}

function getGivenTime() {
    if (getNum(timeAfterUnit) === -1) {
        return getNum(timeAfter) * getNum(updateInterval) * getNum(updateIntervalUnit);
    } else {
        return getNum(timeAfter) * getNum(timeAfterUnit);
    }
}

function formatGivenTime() {
    let result = formatNum(getNum(timeAfter));
    switch (timeAfterUnit.value) {
        case "-1":
            return result + " update interval" + (result === "1" ? "" : "s");
        case "1":
            return result + " second" + (result === "1" ? "" : "s");
        case "60":
            return result + " minute" + (result === "1" ? "" : "s");
        case "3600":
            return result + " hour" + (result === "1" ? "" : "s");
        case "86400":
            return result + " day" + (result === "1" ? "" : "s");
    }
}

function formatNum(number) {
    if (!isFinite(number)) return "--";
    if (number.toString().includes("e")) {
        let splitNumber = number.toString().split("e");
        if (splitNumber[1].startsWith("+")) splitNumber[1] = splitNumber[1].slice(1);
        return parseFloat(splitNumber[0]).toFixed(3) + '×10<sup>' + splitNumber[1] + '</sup>';
    }
    if (Math.abs(number) < 1) return number.toLocaleString("en-US", { maximumSignificantDigits: 4 })
    return number.toLocaleString("en-US");
}

document.addEventListener('input', event => {
    update();
})

window.onload = update;