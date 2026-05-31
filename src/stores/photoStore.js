import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { saveItem, getItem, deleteItem, listByType, generateId, deepToRaw, formatStorageError } from '../utils/storage'
import { findBestMatch } from '../utils/colorUtils'
import { compressImage } from '../utils/imageCompress'
import { extractColorsFromBlob } from '../utils/colorExtract'

export const usePhotoStore = defineStore('photo', () => {
  const photos = ref([])
  const collages = ref([])
  const loading = ref(false)

  const sessionPhotos = computed(() => photos.value)

  async function hydrate() {
    loading.value = true
    try {
      photos.value = await listByType('photo')
      collages.value = await listByType('collage')
    } finally {
      loading.value = false
    }
  }

  async function addPhotos(files, targetColors, location = null, onProgress) {
    const list = Array.from(files)
    const results = []
    for (let i = 0; i < list.length; i++) {
      results.push(await addPhoto(list[i], targetColors, location))
      onProgress?.(i + 1, list.length)
    }
    return results
  }

  async function addPhoto(file, targetColors, location = null) {
    const { blob, thumbnail } = await compressImage(file)
    const dominantColors = await extractColorsFromBlob(blob)
    const match = findBestMatch(dominantColors[0], targetColors)

    const photo = {
      id: generateId(),
      blob,
      thumbnail,
      dominantColors,
      targetColors: targetColors.map((c) => c.hex || c),
      matchHex: match.hex || match,
      matchName: match.name || '',
      createdAt: Date.now(),
      location,
    }
    await saveItem('photo', photo.id, photo)
    photos.value.unshift(photo)
    if (location) {
      const { useMapStore } = await import('./mapStore')
      const mapStore = useMapStore()
      await mapStore.addMarker({
        lat: location.lat,
        lng: location.lng,
        color: match.hex || match,
        photoId: photo.id,
        colorCardId: null,
      })
    }
    return photo
  }

  async function removePhoto(id) {
    await deleteItem('photo', id)
    photos.value = photos.value.filter((p) => p.id !== id)
  }

  async function getPhoto(id) {
    return (await getItem('photo', id)) || photos.value.find((p) => p.id === id)
  }

  async function saveCollage(collage) {
    const id = collage?.id
    if (!id) throw new Error('拼贴缺少 id')
    const blob = collage.imageBlob
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error('拼贴图片无效或为空，请重新生成预览后再试')
    }

    const base = {
      id,
      templateId: collage.templateId || 'A',
      photoIds: Array.isArray(collage.photoIds) ? [...collage.photoIds] : [],
      colors: Array.isArray(collage.colors) ? [...collage.colors] : [],
      createdAt: collage.createdAt || Date.now(),
    }

    let record = { ...base, imageBlob: blob }

    try {
      await saveItem('collage', id, deepToRaw(record))
    } catch (e) {
      const msg = e?.message || ''
      const isClone =
        e?.name === 'DataCloneError' || /clone|could not be cloned|structured clone/i.test(msg)
      if (isClone) {
        const ab = await blob.arrayBuffer()
        record = {
          ...base,
          imageBlob: null,
          imageArrayBuffer: ab,
          imageMime: blob.type || 'image/jpeg',
        }
        await saveItem('collage', id, deepToRaw(record))
      } else {
        throw e
      }
    }

    collages.value.unshift({ ...base, imageBlob: blob })
  }

  async function removeCollage(id) {
    await deleteItem('collage', id)
    collages.value = collages.value.filter((c) => c.id !== id)
  }

  return {
    photos,
    collages,
    loading,
    sessionPhotos,
    hydrate,
    addPhoto,
    addPhotos,
    removePhoto,
    getPhoto,
    saveCollage,
    removeCollage,
  }
})
