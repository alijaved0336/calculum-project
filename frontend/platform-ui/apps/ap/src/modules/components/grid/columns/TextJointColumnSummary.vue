<template>
  <span>{{ operation }}</span>
</template>

<script lang='ts'>

export default {
  name: 'TextJointColumnSummary',
  inject: {
    kendoIntlService: { default: null }
  },
  props: {
    field: { type: String, required: true },
    dataSet: { type: Object, required: true }
  },
  computed: {
    operation: function(props: any) {
      let result = ''
      const founds = []
      let x = 0
      const searchingInCount = props.dataSet.length
      let firstAdded = false

      while (x < searchingInCount) {
        const element = props.dataSet[x]
        x++
        let lookingFor = element[props.field]

        if (lookingFor == null) {
          continue
        }

        lookingFor = lookingFor.displayText ?? lookingFor.description ?? lookingFor.name ?? lookingFor
        let alreadyAdded = false

        const foundsCount = founds.length
        let i = 0
        while (!alreadyAdded && i < foundsCount) {
          const searching = founds[i]
          i++
          if (searching == lookingFor) {
            alreadyAdded = true
            break
          }
        }
        if (alreadyAdded) {
          continue
        }

        founds.push(lookingFor)

        if (firstAdded) {
          result += ', '
        }

        result += lookingFor
        firstAdded = true
      }

      return result
    }
  }
}
</script>

<style lang="scss" scoped>

</style>
