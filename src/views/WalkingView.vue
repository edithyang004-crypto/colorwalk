<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** 主流程已并入 MapView，保留 /walking 路由并重定向 */
onMounted(() => {
  router.replace('/')
})
</script>

<template>
  <div class="walking-redirect" aria-hidden="true" />
</template>

<style scoped>
.walking-redirect {
  min-height: 100vh;
  background: var(--bg-primary);
}
</style>
