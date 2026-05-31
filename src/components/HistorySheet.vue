<script setup>
import { ref } from 'vue'
import { Pencil } from 'lucide-vue-next'

defineProps({
  walks: { type: Array, default: () => [] },
  demoCard: { type: Object, default: null },
})

const emit = defineEmits(['select-walk', 'select-demo', 'about', 'delete-walk', 'rename-walk'])

const editingWalkId = ref(null)
const editWalkName = ref('')

function formatDate(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function walkTitle(walk) {
  return walk.pathName || walk.name || '未命名路径'
}

function walkMeta(walk) {
  const stats = walk.stats || {}
  const colors = stats.colorCount ?? walk.colorNodes?.length ?? walk.cardIds?.length ?? 0
  const duration = stats.durationLabel || '—'
  const distance = stats.distanceLabel || '—'
  return `${duration} · ${distance} · ${colors} 种颜色`
}

function onDeleteWalk(walk) {
  if (!confirm('确定删除这条历史路径？其下的色卡与照片也会从画廊中移除。')) return
  emit('delete-walk', walk)
}

function startRename(walk, event) {
  event.stopPropagation()
  editingWalkId.value = walk.id
  editWalkName.value = walkTitle(walk)
}

function cancelRename() {
  editingWalkId.value = null
  editWalkName.value = ''
}

function saveRename(walk) {
  const trimmed = editWalkName.value.trim()
  if (!trimmed) return
  emit('rename-walk', walk, trimmed)
  cancelRename()
}
</script>

<template>
  <div class="history-sheet">
    <section class="section">
      <p class="ios-section-header">历史路径</p>
      <p v-if="!walks.length" class="empty">还没有漫步记录，点击「+ 新建路径」开始</p>
      <ul v-else class="card-list">
        <li v-for="walk in walks" :key="walk.id" class="walk-row stagger-in">
          <div class="walk-card-wrap">
            <button type="button" class="walk-card" @click="$emit('select-walk', walk)">
              <div class="walk-card-body">
                <div v-if="editingWalkId === walk.id" class="rename-row" @click.stop>
                  <input
                    v-model="editWalkName"
                    class="rename-input"
                    maxlength="40"
                    aria-label="路径名称"
                    @keyup.enter="saveRename(walk)"
                  />
                  <div class="rename-actions">
                    <button type="button" class="rename-action" @click="saveRename(walk)">保存</button>
                    <button type="button" class="rename-action rename-action--muted" @click="cancelRename">取消</button>
                  </div>
                </div>
                <template v-else>
                  <p class="card-name">{{ walkTitle(walk) }}</p>
                  <p class="card-date">{{ formatDate(walk.startedAt) }}</p>
                  <p class="card-meta">{{ walkMeta(walk) }}</p>
                </template>
              </div>
              <span v-if="editingWalkId !== walk.id" class="card-chevron" aria-hidden="true">›</span>
            </button>
            <button
              v-if="editingWalkId !== walk.id"
              type="button"
              class="walk-rename-btn"
              data-no-drag
              aria-label="修改路径名称"
              @click.stop="startRename(walk, $event)"
            >
              <Pencil :size="13" :stroke-width="2" />
            </button>
            <button
              type="button"
              class="walk-del-btn"
              data-no-drag
              aria-label="删除此路线"
              @click.stop="onDeleteWalk(walk)"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/>
              </svg>
            </button>
          </div>
        </li>
      </ul>
    </section>

    <section v-if="demoCard" class="section">
      <p class="ios-section-header">七彩洞头村之旅</p>
      <button type="button" class="walk-card demo-card stagger-in" @click="$emit('select-demo')">
        <div class="walk-card-body">
          <p class="card-name">{{ demoCard.title }}</p>
          <p class="card-date">{{ demoCard.date }}</p>
          <p class="card-meta">{{ demoCard.meta }}</p>
        </div>
        <span class="card-chevron" aria-hidden="true">›</span>
      </button>
    </section>

    <section class="section section-about">
      <button type="button" class="about-link btn-plain" data-no-drag @click="$emit('about')">
        关于 Colorwalk →
      </button>
    </section>
  </div>
</template>

<style scoped>
.history-sheet {
  padding: 0 4px 8px;
  max-height: calc(var(--sheet-expanded-height) - 88px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  background: transparent;
}

@media (min-width: 1024px) and (orientation: landscape) {
  .history-sheet {
    max-height: none;
    min-height: 100%;
  }
}

.section {
  margin-bottom: 24px;
}

.empty {
  font-size: var(--font-subhead);
  color: var(--text-muted);
  line-height: 1.55;
  padding: 12px 4px;
}

.card-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.walk-row {
  display: block;
}

.walk-card-wrap {
  position: relative;
}

.walk-card {
  display: flex;
  align-items: center;
  width: 100%;
  text-align: left;
  padding: 16px 18px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-card);
  box-shadow: none;
  cursor: pointer;
  transition:
    transform var(--transition-smooth),
    box-shadow var(--transition-smooth);
}

.demo-card {
  width: 100%;
  background: var(--bg-surface);
  border: none;
}

@media (hover: hover) {
  .walk-card:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow-accent);
  }
}

.walk-card:active {
  transform: scale(0.97);
}

.walk-card-body {
  flex: 1;
  min-width: 0;
  padding-right: 32px;
}

.card-chevron {
  flex-shrink: 0;
  font-size: 20px;
  color: var(--text-muted);
  line-height: 1;
  margin-right: -4px;
}

.walk-del-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-app);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
}

.walk-rename-btn {
  position: absolute;
  top: 12px;
  right: 44px;
  z-index: 2;
  width: 26px;
  height: 26px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--bg-app);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background var(--duration-fast) ease, color var(--duration-fast) ease;
}

.walk-rename-btn:active {
  background: color-mix(in srgb, var(--brand-primary) 12%, transparent);
  color: var(--brand-primary);
  transform: scale(0.92);
}

.rename-row {
  padding-right: 8px;
}

.rename-input {
  width: 100%;
  font-size: var(--font-body);
  font-weight: var(--font-weight-semibold);
  border: 1.5px solid var(--brand-soft);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  margin-bottom: 8px;
  background: var(--bg-app);
  outline: none;
}

.rename-actions {
  display: flex;
  gap: 12px;
}

.rename-action {
  font-size: var(--font-caption-1);
  font-weight: var(--font-weight-semibold);
  color: var(--brand-primary);
}

.rename-action--muted {
  color: var(--text-muted);
}

.walk-del-btn:active {
  background: color-mix(in srgb, var(--accent-coral) 12%, transparent);
  color: var(--accent-coral);
  transform: scale(0.92);
}

.card-name {
  font-size: var(--font-body);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 4px;
  letter-spacing: var(--letter-tight);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-date {
  font-size: var(--font-footnote);
  color: var(--text-secondary);
  margin: 0 0 3px;
}

.card-meta {
  font-size: var(--font-caption-1);
  color: var(--text-muted);
  margin: 0;
}

.section-about {
  margin-bottom: 8px;
  text-align: center;
}

.about-link {
  font-size: var(--font-footnote);
}
</style>
