
import { getNumberWithDecimals } from '@/utils/FormatData'

export default (data :any, maxLines: number) :Array<any> => {
  let { minValue, maxValue } = findValue(data)
  maxValue = maxValue !== 0 ? getRoundedMaxNumber(maxValue) : 0
  minValue = getRoundedMinNumber(minValue, data.length)
  return generateData(minValue, maxValue, data.length, maxLines)
}

const generateData = (minValue :number, maxValue :number, dataLength :number, maxLines: number) :Array<any> => {
  const generateArray = []
  const averageValue = (minValue + maxValue) / 2
  let items = 0
  if (minValue < 999000 || maxLines === 4) items = 4
  else if (minValue > 999000 || maxLines === 5) items = 5

  generateArray.push({ v: roundingNumbers(minValue), f: getNumberWithDecimals(`${roundingNumbers(minValue)}`, 0) })
  if (items === 3 || dataLength === 2) generateArray.push({ v: roundingNumbers(averageValue), f: getNumberWithDecimals(`${roundingNumbers(averageValue)}`, 0) })
  else if (items === 4 && dataLength !== 2) {
    generateArray.push(
      { v: roundingNumbers((minValue + maxValue) * 0.33), f: getNumberWithDecimals(`${roundingNumbers((minValue + maxValue) * 0.33)}`, 0) },
      { v: roundingNumbers((minValue + maxValue) * 0.67), f: getNumberWithDecimals(`${roundingNumbers((minValue + maxValue) * 0.67)}`, 0) }
    )
  } else if (items === 5 && dataLength !== 2) {
    generateArray.push(
      { v: roundingNumbers((minValue + maxValue) * 0.3), f: getNumberWithDecimals(`${roundingNumbers((minValue + maxValue) * 0.3)}`, 0) },
      { v: roundingNumbers(averageValue), f: getNumberWithDecimals(`${roundingNumbers(averageValue)}`, 0) },
      { v: roundingNumbers((minValue + maxValue) * 0.7), f: getNumberWithDecimals(`${(roundingNumbers(minValue + maxValue) * 0.7)}`, 0) }
    )
  }
  generateArray.push({ v: roundingNumbers(maxValue), f: getNumberWithDecimals(`${getRoundedMaxNumber(maxValue)}`, 0) })
  return generateArray
}

const roundingNumbers = (num :number) :number => {
  const roundingNumber = (amount :number) :number => +num.toString().split('').map((el, index) => index > amount - 1 && el !== '.' ? 0 : el).join('')

  if (num <= 99) return Math.round(num)
  else if (num >= 100 && num <= 999) return roundingNumber(2)
  else if (num >= 1000) return roundingNumber(3)

  return num
}

const findValue = (data :any) => {
  let maxValue = 0
  let minValue = 0

  data.forEach((row: any[], rowIndex: number) => row.forEach((el: number, elIndex: number) => {
    if (!Number.isInteger(Math.round(el))) return null
    if (elIndex === 1 && rowIndex === 1) minValue = el
    if (maxValue < el) maxValue = el
    if (minValue > el) minValue = el
  }))

  return { maxValue, minValue }
}

const getRoundedMaxNumber = (num :number) :number => {
  let increment = 1
  num = num * 1.01
  if (num < -1000) num = -1000
  else if (num < -900) num = -900
  else if (num < -800) num = -800
  else if (num < -700) num = -700
  else if (num < -600) num = -600
  else if (num < -500) num = -500
  else if (num < -450) num = -450
  else if (num < -400) num = -400
  else if (num < -350) num = -350
  else if (num < -300) num = -300
  else if (num < -275) num = -275
  else if (num < -250) num = -250
  else if (num < -225) num = -225
  else if (num < -175) num = -175
  else if (num < -150) num = -160
  else if (num < -125) num = -125
  else if (num < -100) num = -100
  else if (num < -90) num = -90
  else if (num < -80) num = -80
  else if (num < -70) num = -70
  else if (num < -60) num = -60
  else if (num < -50) num = -50
  else if (num < -40) num = -40
  else if (num < -30) num = -30
  else if (num < -20) num = -20
  else if (num < -10) num = -10
  else if (num < 10) num = 10
  else if (num < 20) num = 20
  else if (num < 30) num = 30
  else if (num < 40) num = 40
  else if (num < 50) num = 50
  else if (num < 60) num = 60
  else if (num < 70) num = 70
  else if (num < 80) num = 80
  else if (num < 90) num = 90
  else if (num < 100) num = 100
  else if (num < 125) num = 125
  else if (num < 150) num = 160
  else if (num < 175) num = 175
  else if (num < 225) num = 225
  else if (num < 250) num = 250
  else if (num < 275) num = 275
  else if (num < 300) num = 300
  else if (num < 350) num = 350
  else if (num < 400) num = 400
  else if (num < 450) num = 450
  else if (num < 500) num = 500
  else if (num < 600) num = 600
  else if (num < 700) num = 700
  else if (num < 800) num = 800
  else if (num < 900) num = 900
  else if (num < 1000) num = 1000
  else {
    (function incrementСycle():any {
      if (num < 1200 * increment) num = 1200 * increment
      else if (num < 1300 * increment) num = 1300 * increment
      else if (num < 1400 * increment) num = 1400 * increment
      else if (num < 1500 * increment) num = 1500 * increment
      else if (num < 1600 * increment) num = 1600 * increment
      else if (num < 1700 * increment) num = 1700 * increment
      else if (num < 1800 * increment) num = 1800 * increment
      else if (num < 1900 * increment) num = 1900 * increment
      else if (num < 2000 * increment) num = 2000 * increment
      else if (num < 2250 * increment) num = 2250 * increment
      else if (num < 2500 * increment) num = 2500 * increment
      else if (num < 2750 * increment) num = 2750 * increment
      else if (num < 3000 * increment) num = 3000 * increment
      else if (num < 3500 * increment) num = 3500 * increment
      else if (num < 4000 * increment) num = 4000 * increment
      else if (num < 4500 * increment) num = 4500 * increment
      else if (num < 5000 * increment) num = 5000 * increment
      else if (num < 5500 * increment) num = 5500 * increment
      else if (num < 6000 * increment) num = 6000 * increment
      else if (num < 7000 * increment) num = 7000 * increment
      else if (num < 8000 * increment) num = 8000 * increment
      else if (num < 9000 * increment) num = 9000 * increment
      else if (num < 10000 * increment) num = 10000 * increment
      else {
        increment *= 10
        incrementСycle()
      }
    }())
  }
  return num
}

const getRoundedMinNumber = (num :number, dataLength: number) :number => {
  num = num * dataLength < 2 ? num * 0.99 : num * 0.7
  if (num < -1000) num = -1000
  else if (num < -900) num = -900
  else if (num < -800) num = -800
  else if (num < -700) num = -700
  else if (num < -600) num = -600
  else if (num < -500) num = -500
  else if (num < -450) num = -450
  else if (num < -400) num = -400
  else if (num < -350) num = -350
  else if (num < -300) num = -300
  else if (num < -275) num = -275
  else if (num < -250) num = -250
  else if (num < -225) num = -225
  else if (num < -175) num = -175
  else if (num < -150) num = -160
  else if (num < -125) num = -125
  else if (num < -100) num = -100
  else if (num < -90) num = -90
  else if (num < -80) num = -80
  else if (num < -70) num = -70
  else if (num < -60) num = -60
  else if (num < -50) num = -50
  else if (num < -40) num = -40
  else if (num < -30) num = -30
  else if (num < -20) num = -20
  else if (num < -10) num = -10
  else if (num < 10) num = 0
  else if (num < 25) num = 10
  else if (num < 50) num = 25
  else if (num < 100) num = 50
  else if (num < 500) num = 100
  else if (num < 1000) num = 500
  else num = +num.toString().split('').map((el, index) => index === 0 ? +el !== 1 ? +el - 1 : el : el === '.' ? el : 0).join('')
  return num
}
