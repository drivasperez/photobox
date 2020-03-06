function convertShutter(string) {
  var input = string;
  var length = string.length;
  var index = [];

  for (i = 0; i < length; i++) {
    var theIndex = input.substr(i, 1);
    index[i] = theIndex;
  }
  var arrLength = index.length;
  var partOne = []; // Zeros
  var partTwo = []; // Numbers larger than 0
  for (i = 0; i < arrLength; i++) {
    var value = index[i];
    if (value <= 0) {
      partOne += value;
    } else if (value === ".") {
      partOne += value;
    } else if (value > 0 && value != null) {
      partTwo += value;
    } else {
      console.log(`${value} at ${i} did not fall in a category!`);
    }
  }

  var arr1Len = partOne.length - 2;
  var arr2Len = partTwo.length;

  var power = Math.pow(10, arr1Len + arr2Len);

  // Factoring Numerator, the first index of the second array (125 in this case)
  var stepOneNumerator = partTwo;

  // Take the power (100,000) and divide by the numerator (125) to get 800 (125 goes into 100,000 800 times)
  var factoring = power / stepOneNumerator;

  // result[0] = Numerator, result[0] = denominator (result = regular shutter speed)
  var result = [1, Math.round(factoring)];

  return result.join("/");
}

module.exports = convertShutter;
