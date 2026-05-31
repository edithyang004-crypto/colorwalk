<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AboutSheet from '../components/AboutSheet.vue'

const router = useRouter()
const show = ref(true)

onMounted(() => {
  show.value = true
})

function onClose() {
  show.value = false
  if (router.options.history.state.back) {
    router.back()
  } else {
    router.push('/')
  }
}
</script>

<template>
  <AboutSheet :show="show" @close="onClose" />
</template>
