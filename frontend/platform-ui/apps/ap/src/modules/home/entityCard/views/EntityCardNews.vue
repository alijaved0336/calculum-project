<template>
<div class="news-wrapper">
  <div class="news-header d-flex justify-content-end mr-4 mb-3 w-100" v-if="!loading && !error && (articles.length > 0 || isAdmin)">
    <div class="d-flex align-items-center gap-2" v-if="articles.length > 0"><span class="text-sm text-gray-500 mr-4">{{ articles.length }} of {{ totalArticles }} {{ $t('home.entityCard.news.articles') }}</span>
      <div class="view-toggle-buttons d-flex align-items-center gap-1 mr-4">
        <button class="view-toggle-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" :title="$t('home.entityCard.news.twoColumnsView')">
          <IconGrid></IconGrid>
        </button>
        <button class="view-toggle-btn" :class="{ active: viewMode === 'single' }" @click="viewMode = 'single'" :title="$t('home.entityCard.news.singleColumnView')">
          <IconList></IconList>
        </button>
      </div>
    </div>
    <div class="d-flex align-items-center" v-if="isAdmin">
      <Tooltip :open-delay="100" :anchor-element="'anchor'" :position="'top'">
        <button class="btn btn-link settings-btn p-1 mr-2" @click="goToNewsSetup" :title="$t('home.entityCard.news.settings')">
          <IconSettings class="settings-icon" :title="$t('home.entityCard.news.settings')"> </IconSettings>
        </button>
      </Tooltip>
    </div>
  </div>
  <div class="d-flex justify-content-center align-items-center" v-if="loading" style="min-height: 300px;">
    <div class="d-flex flex-column align-items-center"><span class="spinner-border spinner-border-sm mb-3"></span><span class="text-sm text-gray-500">{{ $t('home.entityCard.news.loading') }}</span></div>
  </div>
  <div class="d-flex justify-content-center align-items-center" v-else-if="error" style="min-height: 300px;">
    <div class="d-flex flex-column align-items-center text-center">
      <iconAlertsWarningExclamationTriangle class="mb-3 error-icon"></iconAlertsWarningExclamationTriangle><span class="text-base font-semibold text-gray-700 mb-2">{{ $t('home.entityCard.news.errorTitle') }}</span><span class="text-sm text-gray-500 mb-3">{{ errorMessage }}</span>
      <button class="btn btn-primary btn-sm" @click="fetchNews">{{ $t('home.entityCard.news.retry') }}</button>
    </div>
  </div>
  <div class="d-flex justify-content-center align-items-center" v-else-if="articles.length === 0" style="min-height: 300px;">
    <div class="d-flex flex-column align-items-center text-center">
      <iconDocument class="mb-3 empty-icon"></iconDocument><span class="text-base font-semibold text-gray-700 mb-2">{{ $t('home.entityCard.news.noResults') }}</span><span class="text-base text-gray-500">{{  entityName ? $t('home.entityCard.news.noResultsDescription', { name: entityName }) : $t('home.entityCard.news.noResultsDescriptionGeneral') }}</span>
    </div>
  </div>
  <div class="news-container-wrapper" v-else :class="{ 'single-column': viewMode === 'single' }">
    <div class="news-article-card" v-for="(article, index) in articles" :key="index">
      <div class="card cursor-pointer" @click="openArticle(article.url)">
        <div class="row">
          <div class="mb-3 mb-md-0" v-if="article.image" :class="viewMode === 'single' ? 'col-xl-2 col-lg-3 col-md-3' : 'col-xl-4 col-lg-4 col-md-4'">
            <div class="article-image-container" :class="{ 'image-container-single': viewMode === 'single' }"><img class="article-image" v-if="!imageErrors[index]" :src="getProxiedImageUrl(article.image)" :alt="article.title" @error="handleImageError(index)" loading="lazy"/>
              <div class="image-placeholder" v-else><img class="placeholder-image" :src="newsPlaceholder" alt="News placeholder"/></div>
            </div>
          </div>
          <div class="col" :class="getContentColumnClass(!!article.image)">
            <div class="d-flex flex-column h-100">
              <div class="d-flex align-items-center mb-2"><span class="text-xs font-semibold text-primary-600 mr-2">{{ article.source.name }}</span><span class="text-xs text-gray-400">•</span><span class="text-xs text-gray-500 ml-2">{{ formatDate(article.publishedAt) }}</span></div>
              <h3 class="text-2xl font-semibold text-gray-600 mb-2 article-title">{{ article.title }}</h3>
              <p class="text-base text-gray-600 mb-3 article-description">{{ article.description }}</p>
              <div class="d-flex">
                <div class="d-flex align-items-center text-primary-600"><span class="text-sm font-medium cursor-pointer">{{ $t('home.entityCard.news.readMore') }}</span>
                  <NewTabIcon class="ml-1 external-link-icon"></NewTabIcon>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="row w-100">
    <div class="col-12 d-flex justify-content-center py-4" v-if="hasMore" ref="scrollSentinel"><span class="spinner-border spinner-border-sm" v-if="loadingMore"></span><span class="text-gray-400 text-sm" v-else>&nbsp;</span></div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch, onBeforeUnmount, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useEntityCardStore } from '@/stores/entityCard';
import { useUser, useSpendFile } from '@/composables';
import type { GNewsArticle, EntityCard, NewsConfig } from '@/types';
import { NEWS_CONFIG_DEFAULT_TERMS, NEWS_CONFIG_DEFAULT_ENTITIES } from '@/types';
import iconAlertsWarningExclamationTriangle from '@/resources/assets/images/icons/iconAlertsWarningExclamationTriangle.vue';
import iconDocument from '@/resources/assets/images/icons/IconDocument.vue';
import IconGrid from '@/resources/assets/images/icons/IconGrid.vue';
import IconList from '@/resources/assets/images/icons/IconList.vue';
import IconSettings from '@/resources/assets/images/icons/IconSettings.vue';
import type { PropType } from 'vue';
import newsPlaceholder from '@/resources/assets/images/news-placeholder.webp';
import * as Routing from '@/services/router/Routing'
import { Tooltip } from "@progress/kendo-vue-tooltip";

export default defineComponent({
  name: 'EntityCardNews',
  components: {
    iconAlertsWarningExclamationTriangle,
    iconDocument,
    IconGrid,
    IconList,
    IconSettings,
    Tooltip
  },
  props: {
    entityName: {
      type: String,
      required: true
    },
    moduleName: {
      type: String,
      required: true
    },
    entityDetails: {
      type: Object as PropType<EntityCard.EntityDetails>,
      required: false,
      default: () => ({})
    }
    
  },
  emits: ['close'],
  setup(props, { emit }) {
    const translate = useI18n({ warnHtmlMessage: false, useScope: 'global' });
    const router = useRouter();
    const entityCardStore = useEntityCardStore();
    const { userIsAdmin, userIsSuperAdmin } = useUser();
    const { getNewsConfig, updateNewsConfig } = useSpendFile();
    // Check if user is admin
    const isAdmin = computed(() => userIsAdmin.value || userIsSuperAdmin.value);

    /**
     * Navigate to News Setup in the Setup module
     */
    function goToNewsSetup(): void {
      emit('close');
      router.push({
        name: Routing.home.homeCompanySettings,
        query: {          
          selectedTab: 'news',
        }
      });
    }
    
    // State
    const loading = ref(true);
    const loadingMore = ref(false);
    const error = ref(false);
    const errorMessage = ref('');
    const articles = ref<GNewsArticle[]>([]);
    const totalArticles = ref(0);
    const currentPage = ref(1);
    const articlesPerPage = 25;
    const viewMode = ref<'single' | 'grid'>('grid');
    const imageErrors = ref<Record<number, boolean>>({});
    const scrollSentinel = ref<HTMLElement | null>(null);
    let intersectionObserver: IntersectionObserver | null = null;

    // News configuration from backend
    const newsConfig = ref<NewsConfig | null>(null);
    const configLoaded = ref(false);
    
    // Query information from backend
    const searchQuery = ref<string>('');
    const searchQuerySanitized = ref<string>('');

    // Computed-like reactive property for hasMore
    const hasMore = ref(false);

    function updateHasMore(): void {
      hasMore.value = articles.value.length < totalArticles.value;
    }

    /**
     * Load news configuration from user object (populated by UserDataProvider)
     * Falls back to defaults if not available
     */
    function loadNewsConfig(): void {
      // Use newsConfig from user object (loaded with user profile)
      if (getNewsConfig.value) {
        newsConfig.value = getNewsConfig.value;
        updateNewsConfig(getNewsConfig.value);
      } else {
        // Use defaults if not available
        newsConfig.value = getDefaultConfig();
        updateNewsConfig(getDefaultConfig());
      }
      configLoaded.value = true;
    }

    /**
     * Get default configuration when backend fails
     */
    function getDefaultConfig(): NewsConfig {
      return {
        generalNews: {
          keywords: '',
          selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
          additionalTerms: ''
        },
        supplierNews: {
          selectedEntities: [...NEWS_CONFIG_DEFAULT_ENTITIES],
          selectedTerms: [...NEWS_CONFIG_DEFAULT_TERMS],
          additionalTerms: ''
        }
      };
    }


    /**
     * Fetch news articles from GNews API via store
     */
    async function fetchNews(): Promise<void> {
      loading.value = true;
      error.value = false;
      errorMessage.value = '';
      articles.value = [];
      totalArticles.value = 0;
      currentPage.value = 1;
      imageErrors.value = {};
      searchQuery.value = '';
      searchQuerySanitized.value = '';

      const parentName = props.entityDetails?.ultimateParentCompanyName;

      await entityCardStore.getNews({
        moduleName: props.moduleName,
        entityName: props.entityName,
        parentName: parentName,
        lang: 'en',
        max: articlesPerPage,
        page: 1,
        callbackSuccess: (data: any) => {
          // Store query information if available
          if (data?.query) {
            searchQuery.value = data.query;
          }
          if (data?.querySanitized) {
            searchQuerySanitized.value = data.querySanitized;
          }
          
          if (data?.success && data?.data) {
            // Handle different response structures from GNews API
            // Paid plans may return articles in different locations
            let fetchedArticles = data.data.articles || [];
            
            // If no articles in main array, check realTimeArticles
            if (fetchedArticles.length === 0 && data.data.information?.realTimeArticles?.articles) {
              fetchedArticles = data.data.information.realTimeArticles.articles;
            }
            
            articles.value = fetchedArticles;
            totalArticles.value = data.data.totalArticles || fetchedArticles.length || 0;
            updateHasMore();
          } else if (data?.error) {
            error.value = true;
            errorMessage.value = data.error.message || translate.t('home.entityCard.news.errorLoading');
          }
          loading.value = false;
        },
        callbackError: (response: any) => {
          // Store query information if available in error response
          if (response?.data?.query) {
            searchQuery.value = response.data.query;
          }
          if (response?.data?.querySanitized) {
            searchQuerySanitized.value = response.data.querySanitized;
          }
          
          error.value = true;
          errorMessage.value = response?.data?.error?.message || response?.error?.message || translate.t('home.entityCard.news.errorLoading');
          loading.value = false;
        }
      });
    }

    /**
     * Load more articles (pagination)
     */
    async function loadMore(): Promise<void> {
      if (loadingMore.value || !hasMore.value) return;

      loadingMore.value = true;
      const nextPage = currentPage.value + 1;
      const parentName = props.entityDetails?.ultimateParentCompanyName;

      await entityCardStore.getNews({
        moduleName: props.moduleName,
        entityName: props.entityName,
        parentName: parentName,
        lang: 'en',
        max: articlesPerPage,
        page: nextPage,
        callbackSuccess: (data: any) => {
          if (data?.success && data?.data) {
            // Handle different response structures from GNews API
            let fetchedArticles = data.data.articles || [];
            
            // If no articles in main array, check realTimeArticles
            if (fetchedArticles.length === 0 && data.data.information?.realTimeArticles?.articles) {
              fetchedArticles = data.data.information.realTimeArticles.articles;
            }
            
            if (fetchedArticles.length > 0) {
              articles.value = [...articles.value, ...fetchedArticles];
              currentPage.value = nextPage;
              updateHasMore();
            } else {
              // No more articles
              hasMore.value = false;
            }
          } else {
            // No more articles
            hasMore.value = false;
          }
          loadingMore.value = false;
        },
        callbackError: () => {
          // Don't show error for load more, just stop pagination
          hasMore.value = false;
          loadingMore.value = false;
        }
      });
    }

    /**
     * Format the published date for display
     */
    function formatDate(dateString: string): string {
      try {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
          return translate.t('home.entityCard.news.justNow');
        } else if (diffHours < 24) {
          return `${diffHours} ${diffHours > 1 ? translate.t('home.entityCard.news.hoursAgo') : translate.t('home.entityCard.news.hourAgo')}`;
        } else if (diffDays < 7) {
          return `${diffDays} ${diffDays > 1 ? translate.t('home.entityCard.news.daysAgo') : translate.t('home.entityCard.news.dayAgo')}`;
        } else {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
        }
      } catch {
        return dateString;
      }
    }

    /**
     * Open article in new tab
     */
    function openArticle(url: string): void {
      window.open(url, '_blank', 'noopener,noreferrer');
    }

    /**
     * Handle image load error - mark image as failed to show placeholder
     */
    function handleImageError(index: number): void {
      imageErrors.value[index] = true;
    }

    /**
     * Get the content column class based on view mode and image presence
     */
    function getContentColumnClass(hasImage: boolean): string {
      if (!hasImage) return 'col-12';
      return viewMode.value === 'single' 
        ? 'col-xl-10 col-lg-9 col-md-9' 
        : 'col-xl-8 col-lg-8 col-md-8';
    }

    /**
     * Get proxied image URL to bypass CSP restrictions
     * Uses wsrv.nl (weserv.nl) as a free image proxy service
     * @param imageUrl - Original image URL from GNews
     * @returns Proxied URL or empty string if no URL provided
     */
    function getProxiedImageUrl(imageUrl: string): string {
      if (!imageUrl) return '';
      // Use wsrv.nl proxy with optimization parameters
      // w=400: resize to 400px width
      // q=80: 80% quality
      // we: ignore errors (returns empty if source fails)
      return `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&w=400&q=80&we`;
    }

    /**
     * Cleanup intersection observer
     */
    function cleanupIntersectionObserver(): void {
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
      }
    }

    /**
     * Setup Intersection Observer for infinite scroll
     */
    function setupIntersectionObserver(): void {
      // Cleanup existing observer first
      cleanupIntersectionObserver();

      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting && hasMore.value && !loadingMore.value) {
            loadMore();
          }
        },
        {
          rootMargin: '100px', // Trigger 100px before reaching the sentinel
          threshold: 0
        }
      );

      // Observe the sentinel element when it exists
      if (scrollSentinel.value) {
        intersectionObserver.observe(scrollSentinel.value);
      }
    }

    /**
     * Watch for sentinel element changes and setup observer
     */
    watch(scrollSentinel, (newVal, oldVal) => {
      // Disconnect old element if it exists
      if (oldVal && intersectionObserver) {
        intersectionObserver.unobserve(oldVal);
      }
      
      // Observe new element if it exists
      if (newVal && intersectionObserver) {
        intersectionObserver.observe(newVal);
      } else if (!newVal) {
        // If sentinel is removed, cleanup observer
        cleanupIntersectionObserver();
      }
    });

    // Fetch news on mount and setup infinite scroll
    onMounted(() => {
      // Load configuration first (from user object), then fetch news
      loadNewsConfig();
      fetchNews();
      setupIntersectionObserver();
    });

    // Cleanup intersection observer on unmount
    onBeforeUnmount(() => {
      cleanupIntersectionObserver();
    });

    // Watch for supplier name changes
    watch(() => props.entityName, () => {
      fetchNews();
    });

    return {
      loading,
      loadingMore,
      error,
      errorMessage,
      articles,
      totalArticles,
      hasMore,
      viewMode,
      imageErrors,
      scrollSentinel,
      isAdmin,
      searchQuery,
      searchQuerySanitized,
      fetchNews,
      loadMore,
      formatDate,
      openArticle,
      handleImageError,
      getProxiedImageUrl,
      goToNewsSetup,
      getContentColumnClass,
      newsPlaceholder,
      getNewsConfig,
      updateNewsConfig
    };
  }
});
</script>

<style lang="scss" scoped>
@import "src/resources/assets/styles/variables/colors.scss";

.reset-margins {
  margin-left: -15px !important;
}

.news-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 8px;
}

.news-header {
  position: sticky;
  top: 0;
  background-color: $color-gray-50;
  z-index: 10;
  padding: 12px 0;
  border-bottom: 1px solid $color-gray-200;
}

.news-container-wrapper {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 16px;
  row-gap: 16px;
  flex: 1;
  // background-color: $color-gray-50;
  // padding: 12px 12px;
  height: 100%;

  // Single column view
  &.single-column {
    grid-template-columns: 1fr;
  }
}

.news-article-card {
  display: flex;
  cursor: pointer;
  margin: 0; // Remove any default margins
  
  .card {
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: 200px;
    cursor: pointer;
    margin: 0; // Remove any default margins from Bootstrap card
    
    // Apply cursor pointer to all children
    * {
      cursor: pointer;
    }
  }
}

.article-image-container {
  width: 100%;  
  height: 180px;
  overflow: hidden;
  border-radius: 8px;
  background-color: $color-gray-100;

  &.image-container-single {
    height: 220px;
  }
}

.article-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;  
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-gray-100;
  border-radius: 8px;
  overflow: hidden;

  .placeholder-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 8px;
  }
}

.article-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

.article-description {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.text-primary-600 {
  color: $color-primary-600;
}

.error-icon {
  width: 48px;
  height: 48px;
  color: $color-yellow-600;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: $color-gray-400;
}

.external-link-icon {
  width: 14px;
  height: 14px;
}



.view-toggle-buttons {
  border: 1px solid $color-gray-200;
  border-radius: 6px;
  padding: 2px;
  background-color: $color-gray-50;
}

.view-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: $color-gray-400;
  cursor: pointer;
  transition: all 0.15s ease-in-out;

  &:hover:not(.active) {
    background-color: $color-gray-100;
    color: $color-gray-600;
  }

  &.active {
    background-color: $color-white;
    color: $color-primary-600;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  svg {
    width: 16px;
    height: 16px;
  }
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;

  &:hover {
    background-color: $color-gray-100;
  }

  .settings-icon {
    width: 18px;
    height: 18px;
    color: $color-gray-500;
  }
}

.query-info {
  .query-box {
    background-color: $color-gray-50;
    border: 1px solid $color-gray-300;
    border-radius: 6px;
    padding: 12px 16px;
    
    .query-label {
      display: block;
      margin-bottom: 4px;
    }
    
    .query-text {
      display: block;
      color: $color-gray-800;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      word-break: break-all;
      white-space: pre-wrap;
      line-height: 1.5;
      background-color: $color-white;
      padding: 8px;
      border-radius: 4px;
      border: 1px solid $color-gray-200;
    }
  }
}

</style>
