<template>
<CalculumModal v-if="showWelcomeVideo" :size="'md'" :showClose="false" :title="$t('global.welcomeVideoModalTitle')" @close="showWelcomeVideo = false">
  <template v-slot:modalContent>
    <div class="welcome-video-wrapper" @click="togglePlay" :class="{ 'is-paused': !isVideoPlaying }">
      <video class="welcome-video" ref="videoPlayer" preload="metadata" @timeupdate="onTimeUpdate" @play="onPlay" @pause="isVideoPlaying = false" @ended="isVideoPlaying = false">
        <source :src="videoUrl" type="video/mp4"/>
      </video>
      <div class="video-poster" v-if="!hasVideoStarted" :style="{ backgroundImage: `url('${previewImage}')` }"></div>
      <div class="video-controls">
        <input class="video-progress" type="range" min="0" :max="videoDuration || 100" :value="videoCurrentTime" :style="{ '--progress': videoDuration ? videoCurrentTime / videoDuration : 0 }" step="0.1" @input="seekVideo" @click.stop/>
        <div class="video-controls-row">
          <button class="video-btn" @click.stop="togglePlay" :aria-label="isVideoPlaying ? 'Pause' : 'Play'">
            <svg class="video-icon" v-if="!isVideoPlaying" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"></path>
            </svg>
            <svg class="video-icon" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path>
            </svg>
          </button>
          <button class="video-btn" @click.stop="toggleFullscreen" :aria-label="isFullscreen ? 'Exit fullscreen' : 'Fullscreen'">
            <svg class="video-icon" v-if="!isFullscreen" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path>
            </svg>
            <svg class="video-icon" v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </template>
  <template v-slot:modalButtons>
    <button class="btn outline-secondary-btn font-md" @click="closeNContinue()" style="width: fit-content"><span>{{$t('global.remindMeLater')}}</span></button>
    <button class="btn btn-primary font-md" @click="closeNContinue(true)" style="width: fit-content"><span>{{$t('global.continueToPlatform')}}</span></button>
  </template>
</CalculumModal>
</template>

<script lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import CalculumModal from '@/modules/components/CalculumModal.vue'
import { useHomeStore } from '@/stores/home'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { useUser, useCompany } from '@/composables'

export default {
  name: 'WelcomeVideoModal',
  components: { CalculumModal },
  setup() {
    const homeStore = useHomeStore()
    const userStore = useUserStore()
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' })
    const { getIsAdaWelcomeVideo, userIri } = useUser()
    const { isNecessaryRemoveAdaReferences } = useCompany()

    const showWelcomeVideo = ref(false)
    const videoUrl = import.meta.env.VITE_CLOUD_FRONT_URL + 'videos/thank_you_feedback_video.mov'
    const previewImage = import.meta.env.VITE_CLOUD_FRONT_URL + 'videos/video_preview.webp'    


    watch(() => homeStore.getGlobalLoading, () => {
      if (
        homeStore.getGlobalLoading === false &&
        getIsAdaWelcomeVideo.value === false &&
        isNecessaryRemoveAdaReferences.value === false
      ) {
        setTimeout(() => { showWelcomeVideo.value = true }, 5000)
      }
    })

    // ── Video player ──────────────────────────────────────────────────────────

    const videoPlayer = ref<HTMLVideoElement | null>(null)
    const isVideoPlaying = ref(false)
    const isFullscreen = ref(false)
    const hasVideoStarted = ref(false)
    const videoDuration = ref(0)
    const videoCurrentTime = ref(0)

    function onPlay() {
      isVideoPlaying.value = true
      hasVideoStarted.value = true
    }

    function onTimeUpdate() {
      if (videoPlayer.value) {
        videoCurrentTime.value = videoPlayer.value.currentTime
      }
    }

    function seekVideo(event: Event) {
      const time = Number((event.target as HTMLInputElement).value)
      if (videoPlayer.value) {
        videoPlayer.value.currentTime = time
        videoCurrentTime.value = time
      }
    }

    function togglePlay() {
      const video = videoPlayer.value
      if (!video) return
      if (video.paused) { video.play() } else { video.pause() }
    }

    function toggleFullscreen() {
      const wrapper = videoPlayer.value?.parentElement
      if (!wrapper) return
      if (!document.fullscreenElement) {
        wrapper.requestFullscreen()
      } else {
        document.exitFullscreen()
      }
    }

    function onFullscreenChange() {
      isFullscreen.value = !!document.fullscreenElement
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    onUnmounted(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

    // ── Modal actions ─────────────────────────────────────────────────────────

    function closeNContinue(patchPreferences: boolean = false) {
      showWelcomeVideo.value = false
      if (!patchPreferences) return
      userStore.updateVideoPreferences({
        obj: { isAdaWelcomeVideo: true },
        user: userIri.value,
        callbackSuccess: () => { if (import.meta.env.DEV) translate.t('global.successfullySaved') },
        callbackError: () => { if (import.meta.env.DEV) translate.t('global.errorSavingData') },
      })
    }

    return {
      showWelcomeVideo,
      videoUrl,
      previewImage,
      videoPlayer,
      isVideoPlaying,
      isFullscreen,
      hasVideoStarted,
      videoDuration,
      videoCurrentTime,
      onPlay,
      onTimeUpdate,
      seekVideo,      
      togglePlay,
      toggleFullscreen,
      closeNContinue,
    }
  }
}
</script>

<style lang="scss" scoped>
.welcome-video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 9 / 16;
  max-height: 120vh;
  border-radius: 8px;
  overflow: hidden;
  line-height: 0;
  cursor: pointer;

  &:hover .video-controls,
  &.is-paused .video-controls {
    opacity: 1;
  }

  &:fullscreen,
  &:-webkit-full-screen {
    width: 100vw;
    height: 100vh;
    border-radius: 0;

    .welcome-video {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }
}

.video-poster {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;  
  pointer-events: none;
}

.welcome-video {
  width: 100%;
  height: 100%;
  display: block;
  outline: none;
  border: none;
  object-fit: cover;
  pointer-events: none;
}

.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 16px 12px 8px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  opacity: 0;
  transition: opacity 0.2s ease;
  line-height: 1;
}

.video-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.video-progress {
  width: 100%;
  height: 3px;
  appearance: none;
  -webkit-appearance: none;
  border-radius: 2px;
  cursor: pointer;
  outline: none;
  background: linear-gradient(
    to right,
    #fff calc(var(--progress, 0) * 100%),
    rgba(255, 255, 255, 0.3) calc(var(--progress, 0) * 100%)
  );

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  &:hover::-webkit-slider-thumb {
    transform: scale(1.3);
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: none;
    cursor: pointer;
  }

  &::-moz-range-track {
    height: 3px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.3);
  }

  &::-moz-range-progress {
    height: 3px;
    border-radius: 2px;
    background: #fff;
  }
}

.video-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover { background: rgba(255, 255, 255, 0.15); }
  &:focus { outline: none; }
}

.video-icon {
  width: 22px;
  height: 22px;
  fill: #fff;
}
</style>

<style lang="scss">
.welcome-video::-webkit-media-controls,
.welcome-video::-webkit-media-controls-enclosure,
.welcome-video::-webkit-media-controls-panel,
.welcome-video::-webkit-media-controls-overlay-play-button,
.welcome-video::-webkit-media-controls-start-playback-button {
  display: none !important;
}
</style>
