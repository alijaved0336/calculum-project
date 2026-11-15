<template>
<CalculumLoading v-if="loadingData || loadingNewContent" :modal="true"></CalculumLoading>
<AskQuestions v-if="showAskQuestions" :email="emailInvitation" :valuePropositionId="valuePropositionId" :invitationId="String(invitationId)" @close="showAskQuestions = false"></AskQuestions>
<CatalogContentSelector v-if="showModalContent" :email="showModalContent" @close="cancelAddContent" :sectionId="String(addContentToThisSection)" :content-types="contentTypes" @add-content="requestContent"></CatalogContentSelector>
<SelectSupplier v-if="showModalContentSelectSupplier" @close="cancelSelectSupplier" :sectionId="String(addContentToThisSection)" @selected-supplier="selectedSupplier" :spend-file-version-active-id="spendFileVersionActiveId"></SelectSupplier>
<SendInvitations v-if="showSendInvitations" :valuePropositionId="valuePropositionId" :invitationId="String(invitationId)" @close="showSendInvitations = false"></SendInvitations>
<ValidateVpPassword v-if="showValidatePassword" :valuePropositionId="valuePropositionId" :invitationId="String(invitationId)" @close="cancelValidatePassword" @set-token="setToken"></ValidateVpPassword>
<SetNewPassword v-if="showResetPassword" :valuePropositionId="valuePropositionId" :invitationId="String(invitationId)" @close="closeResetPassworModal" @set-token="setToken"></SetNewPassword>
<CookiesModal v-if="showCookieModal" @close="showCookieModal = false" @get-vp-data="setCookieSelectedOption" @open-privacy-policy="openPrivacyPolicy = true" :cookiesOption="cookiesOption"></CookiesModal>
<PrivacyPolicyModal v-if="openPrivacyPolicy" @close="openPrivacyPolicy = false"></PrivacyPolicyModal>
<transition name="slide-fade">
  <div class="mobile-menu-container" v-if="showMenuMobileOptions" @click.self="showMenuMobileOptions = false">
    <div class="d-flex mobile-menu">
      <div class="d-flex mobile-menu-title justify-content-between"><span class="text-gray-600 text-base font-semibold cursor-pointer">{{ 'MENU' }}</span><span @click="showMenuMobileOptions = false"><i class="fa-solid fa-xmark"></i></span></div>
      <div class="d-flex flex-column mobile-menu-options">
        <template v-for="(tab) in jsonData.sections" :key="tab.id"><a v-if="tab.visibility" :href="'#section-' + tab.id" @click="showMenuMobileOptions = !showMenuMobileOptions"><span class="text-base">{{ tab.tabTitle }}</span></a></template>
      </div>
    </div>
  </div>
</transition>
<div class="container-vp" v-if="!loadingData && passwordExpired">
  <div class="container">
    <div class="error-section">
      <div class="row w-100">
        <div class="col-12 text-center mb-4"><img class="logo-user-sidebar" :src="images.calculumLogoNoText" :style="{ width: '120px' }"/></div>
        <div class="col-4 text-center d-flex flex-column"></div>
        <div class="col-4 text-center d-flex flex-column"><span class="text-xl font-semibold mb-5">{{ 'You must RESET the password to see the Value Proposition.' }}</span><span class="text-sm font-semibold text-primary-500 cursor-pointer" @click="showResetPassword = true">{{ 'Click here to try reset password' }}</span></div>
        <div class="col-4 text-center d-flex flex-column"></div>
      </div>
    </div>
  </div>
</div>
<div class="container-vp" v-else-if="!loadingData && !thePasswordIsValid">
  <div class="container">
    <div class="error-section">
      <div class="row w-100">
        <div class="col-12 text-center mb-4"><img class="logo-user-sidebar" :src="images.calculumLogoNoText" :style="{ width: '120px' }"/></div>
        <div class="col-4 text-center d-flex flex-column"></div>
        <div class="col-4 text-center d-flex flex-column">               <span class="text-xl font-semibold mb-5">{{ 'You must enter the right password to see the Value Proposition.' }}</span><span class="text-sm font-semibold text-primary-500 cursor-pointer" @click="showValidatePassword = true">{{ 'Click here to try again' }}</span></div>
        <div class="col-4 text-center d-flex flex-column"></div>
      </div>
    </div>
  </div>
</div>
<div class="container-vp" v-else-if="!loadingData && externalUser && !isPublic">
  <div class="container">
    <div class="error-section">
      <div class="row w-100">
        <div class="col-12 text-center mb-4"><img class="logo-user-sidebar" :src="images.calculumLogoNoText" :style="{ width: '120px' }"/></div>
        <div class="col-12 text-center"><span class="text-xl font-semibold mb-5">{{ $t('global.vpErrorDocument') }}</span></div>
      </div>
    </div>
  </div>
</div>
<div class="container-vp" v-else-if="!loadingData && guessWithOutInvitation">
  <div class="container">
    <div class="error-section">
      <div class="row w-100">
        <div class="col-12 text-center mb-4"><img class="logo-user-sidebar" :src="images.calculumLogoNoText" :style="{ width: '120px' }"/></div>
        <div class="col-12 text-center"><span class="text-xl font-semibold mb-5">{{ $t('global.vpErrorDocument') }}</span></div>
      </div>
    </div>
  </div>
</div>
<div class="container-vp" v-else-if="!loadingData && !guessWithOutInvitation">
  <div class="container" @click.self="validateMenuMobileOptions">
    <div class="logo-section">
      <div class="row w-100">
        <div class="col-2 container-center-logos">
          <LogoComponent :editionMode="editionMode" :object-image="jsonData.companyLogo" :logoType="'company-logo'" @change-main-logos="changeMainLogos" :key="'company-logo-' + keyRenderComponent"></LogoComponent>
        </div>
        <div class="col-7 container-center-logos d-flex">
          <div class="col-3 row-100"><span class="text-lg">{{ '' }}</span></div>
          <div class="col-9 row-100">
            <input class="form-control change-name-vp w-100" :class="editionMode ? 'editableTitle' : ''" v-model="jsonData.name" :disabled="!editionMode" @change="setPersistValuePropositionJson" @keyup.enter="setPersistValuePropositionJson"/>
          </div>
        </div>
        <div class="col-1 d-flex flex-column currency-section"><span class="label-topbar" v-if="jsonData.currency">{{ 'Currency' }}</span><span>{{ jsonData.currency }}</span></div>
        <div class="col-2 container-center-logos">
          <LogoComponent :editionMode="editionMode" :object-image="jsonData.partnerLogo" :logoType="'partner-logo'" @change-main-logos="changeMainLogos" :key="'partner-logo-' + keyRenderComponent"></LogoComponent>
        </div>
      </div>
    </div>
    <div class="tabs-section d-flex flex-column">
      <div class="row w-100">
        <div class="col-lg-12 d-flex gap-2 top-buttons-container gap-4 mb-2">
          <button class="button ask" @click="showAskQuestions = true">Ask a Question</button>
          <div class="d-flex gap-4" v-if="showControls">
            <div class="d-flex container-center-logos justify-content-between">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch" :key="editionMode">
                <div class="d-flex controls gap-2 cursor-pointer" @click="editionMode = !editionMode">
                  <div class="icon icon-controls" :title="editionMode ? 'Switch to View Mode' : 'Switch to Edit Mode'"><i class="fa-solid fa-retweet text-xs" :title="editionMode ? 'Switch to View Mode' : 'Switch Edit Mode'"> </i></div><span class="text-xs font-semibold" :title="editionMode ? 'Switch to View Mode' : 'Switch to Edit Mode'">{{ editionMode ? 'Switch to View Mode' : 'Switch to Edit Mode' }}</span>
                </div>
              </Tooltip>
            </div>
            <div class="d-flex container-center-logos justify-content-between" v-if="editionMode">
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch" :key="jsonData.isPublic">
                <div class="d-flex controls gap-2 cursor-pointer" @click="changePublicStatus">
                  <div class="icon icon-controls-private" v-if="jsonData.isPublic" :title="$t('global.switchToPrivateMode')"><i class="fa-solid fa-lock-open text-xs" :title="$t('global.switchToPrivateMode')"> </i></div>
                  <div class="icon icon-controls" v-if="!jsonData.isPublic" :title="$t('global.switchToPublicMode')"><i class="fa-solid fa-lock text-xs" :title="$t('global.switchToPublicMode')"> </i></div><span class="text-xs font-semibold" :title="jsonData.isPublic ? $t('global.vpPlublic') : $t('global.vpPrivate')">{{ jsonData.isPublic ? $t('global.vpPlublic') : $t('global.vpPrivate') }}</span>
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <div class="row w-100">
        <div class="col-lg-12 top-menu-contaier">
          <div class="d-flex flex-column" id="menu-wrapper">
            <div id="menu-mobile" @click="showMenuMobileOptions = !showMenuMobileOptions"><i class="fa-solid fa-bars text-3xl">                                                           </i></div>
          </div>
          <nav class="navbar-expand-lg mt-4">
            <div class="navbarNav collapse navbar-collapse">
              <ul class="navbar-nav" v-if="getSectionsForTabs.length > 0">
                <template v-for="(tab, index) in getSectionsForTabs" :key="tab.id+keyRenderComponent">
                  <li class="nav-item" :class="getTabVisibility(tab)" :draggable="true" @dragstart="handleDragStart(index)" @dragover.prevent @drop="handleDrop(index)"><a class="btn btn-clean font-md text-capitalize custom-padding-btn nav-link active" v-if="index === 0" :href="'#section-' + tab.id" :class="getSectionsForTabs.length === 1 ? '' : 'rounded-tbr-none'">
                      <iconDragDrop class="icon_drag_drop mr-2" v-if="editionMode"></iconDragDrop><span>{{ tab.tabTitle }}</span></a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbl-none btn-clean nav-link" v-else-if="index === getSectionsForTabs.length - 1" :href="'#section-' + tab.id">
                      <iconDragDrop class="icon_drag_drop mr-2" v-if="editionMode"></iconDragDrop><span>{{ tab.tabTitle }}</span></a><a class="btn btn-clean font-md text-capitalize custom-padding-btn rounded-tbr-none rounded-tbl-none custom-fit-btn nav-link" v-else :href="'#section-' + tab.id">
                      <iconDragDrop class="icon_drag_drop mr-2" v-if="editionMode"></iconDragDrop><span>{{ tab.tabTitle }}</span></a></li>
                </template>
              </ul>
              <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
                <div class="icon ml-2" v-if="editionMode" :title="'Add Section'" @click="addSection"> <i class="fa-solid fa-plus text-base" :title="'Add Section'"></i></div>
              </Tooltip>
            </div>
          </nav>
        </div>
      </div>
    </div>
    <div class="content-section show-scroll">
      <div class="row">
        <div class="col-12 row-100">
          <main></main>
          <template v-for="section in getSectionsForContent" :key="section.id">
            <section class="section-vp" :id="'section-' + section.id" :class="editionMode ? 'section-vp-edition' : ''">
              <StickyHeaderWrapper class="sticky-title mb-4">
                <div class="row">
                  <div class="col-lg-8 d-flex gap-2">
                    <div class="d-flex flex-column w-100">
                      <input class="form-control change-tab-title-section" :class="editionMode ? 'editable' : ''" v-model="section.tabTitle" @change="setPersistValuePropositionJson" @keyup.enter="setPersistValuePropositionJson"/>
                    </div>
                  </div>
                  <div class="col-lg-4 d-flex gap-2 actions-by-section" v-if="editionMode">
                    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
                      <div class="icon icon-subsection" v-if="section.visibility" :title="'Hide Section'" @click="sectionVisibility('hide',section)"><i class="fa-solid fa-eye-slash text-sm" :title="'Hide Section'"> </i></div>
                      <div class="icon icon-subsection" v-if="!section.visibility" :title="'Show Section'" @click="sectionVisibility('show',section)"> <i class="fa-solid fa-eye text-base" :title="'Show Section'"></i></div>
                    </Tooltip>
                    <Tooltip :open-delay="50" :anchor-element="'target'" :position="'top'" style="max-width: 20ch">
                      <div class="icon icon-subsection" :title="'Delete Section'" @click="deleteSection(section.id)"> <i class="fa-solid fa-trash-can text-sm" :title="'Delete Section'"> </i></div>
                    </Tooltip>
                  </div>
                </div>
              </StickyHeaderWrapper>
              <template v-for="content in section.contents" :key="content.id">
                <ImageComponent v-if="content.type === 'image' && (content.visibility || editionMode)" :object-image="(content as ImageType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></ImageComponent>
                <IntroductionComponent v-if="content.type === 'introduction' && (content.visibility || editionMode)" :object-content="(content as IntroductionType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" :logo="jsonData.partnerLogo" @change-content="changeContent"></IntroductionComponent>
                <YourValuePropositionComponent v-if="content.type === 'yourValueProposition' && (content.visibility || editionMode)" :object-content="(content as YourValuePropositionType)" :editionMode="editionMode" :logo="jsonData.companyLogo" :key="keyRenderComponent + content.id" @change-content="changeContent"></YourValuePropositionComponent>
                <SubtitleComponent v-if="content.type === 'subtitle' && (content.visibility || editionMode)" :object-content="(content as SubtitleType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></SubtitleComponent>
                <SpendVolumeComponent v-if="content.type === 'spendVolume' && (content.visibility || editionMode)" :object-content="(content as SpendVolumeType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></SpendVolumeComponent>
                <IndustryComponent v-if="content.type === 'industry' && (content.visibility || editionMode)" :object-content="(content as IndustryType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></IndustryComponent>
                <MatchComponent v-if="content.type === 'match' && (content.visibility || editionMode)" :object-content="(content as MatchType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></MatchComponent>
                <SpendVolumeDistributed v-if="content.type === 'spendVolumeDistributed' && (content.visibility || editionMode)" :object-content="(content as SpendVolumeDistributedType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"></SpendVolumeDistributed>
                <SustancialAmount v-if="content.type === 'sustancialAmount' && (content.visibility || editionMode)" :object-content="(content as SustancialAmountType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent">   </SustancialAmount>
                <LowHangingFruits v-if="content.type === 'lowHangingFruits' && (content.visibility || editionMode)" :object-content="(content as LowHangingFruitsType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent">     </LowHangingFruits>
                <TextComponent v-if="content.type === 'text' && (content.visibility || editionMode)" :object-content="(content as SubtitleType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent"> </TextComponent>
                <AnalyzedSupplierContent v-if="content.type === 'analyzedSupplier' && (content.visibility || editionMode)" :object-content="(content as AnalyzedSupplierType)" :editionMode="editionMode" :key="keyRenderComponent + content.id" @change-content="changeContent">                             </AnalyzedSupplierContent>
              </template>
              <div class="add-content mt-4" v-if="editionMode" @click="openContentModal(section.id)"><span class="add-icon"><i class="fa-solid fa-plus text-sm"></i></span><span class="add-text">Add your content</span></div>
            </section>
          </template>
        </div>
        <div class="row mt-4 mb-4">
          <div class="col-12 d-flex justify-content-end"><a class="text-xs text-gray-500 manage-cookie" @click="showCookieModal = true">Manage cookie</a></div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
import { defineComponent, onMounted, toRefs, reactive, computed, ref, watchEffect, watch, nextTick, onUnmounted } from 'vue'
import ImageComponent from '../componentes/ImageComponent.vue';
import LogoComponent from '../componentes/LogoComponent.vue';
import IntroductionComponent from '../componentes/IntroductionComponent.vue';
import SubtitleComponent from '../componentes/SubtitleComponent.vue';
import YourValuePropositionComponent from '../componentes/YourValuePropositionComponent.vue';
import SpendVolumeComponent from '../componentes/SpendVolumeComponent.vue';
import IndustryComponent from '../componentes/IndustryComponent.vue';
import StickyHeaderWrapper from '@/modules/components/StickyHeaderWrapper.vue';
import { ImageType, Sections, JsonDataInterface, defaultJsonDataDemo, IntroductionType, YourValuePropositionType, SubtitleType, SpendVolumeType, IndustryType, CatalogType, MatchType, SpendVolumeDistributedType, SustancialAmountType, LowHangingFruitsType, AnalyzedSupplierType, PropsSelectedSupplier, ContentTypes, TrackingProp } from '@/modules/valueProposition/types';
import { Tooltip } from '@progress/kendo-vue-tooltip'
import iconDragDrop from "@/resources/assets/images/icons/iconDragDrop.vue";
import { isNullOrUndefined, ObjectUtils } from '@/utils';
import { useRoute } from 'vue-router'
import { useSpendFilesStore } from '@/stores/spendFiles'
import { useValuePropositionStore } from '@/stores/valueProposition'
import { useUser, useSpendFile, useProgram } from '@/composables';
import { CalculumLoading } from '@ada/design-system'
import * as CompanyApi from '@/api/companyApi'
import { ApiResponse } from '@/services/api/response'
import { images } from '@/resources/assets/assets'
import { newSection } from './mockupValues';
import AskQuestions from '../componentes/AskQuestions.vue';
import ValidateVpPassword from '../componentes/ValidateVpPassword.vue';
import SetNewPassword from '../componentes/SetNewPassword.vue';
import SendInvitations from '../componentes/SendInvitations.vue';
import { catalog, contentTypeSource, localContentTypes, contentTypeCastMap } from '../data/data';
import MatchComponent from '../componentes/MatchComponent.vue';
import SpendVolumeDistributed from '../componentes/SpendVolumeDistributed.vue';
import SustancialAmount from '../componentes/SustancialAmount.vue';
import LowHangingFruits from '../componentes/LowHangingFruits.vue';
import CatalogContentSelector from '../componentes/CatalogContentSelector.vue';
import TextComponent from '../componentes/TextComponent.vue';
import { useToast } from 'vue-toastification';
import AnalyzedSupplierContent from '../componentes/analyzedSipplier/AnalyzedSupplierContent.vue';
import SelectSupplier from '../componentes/analyzedSipplier/SelectSupplier.vue';
import { extractCleanJson } from '../data/utils';
import { initStickyScrollListener } from '@/composables/useStickyHeaders'
import { getRandomNumberSafer } from '@/modules/components/utils/utilsCharts';
import CookiesModal from '@/modules/home/components/CookiesModal.vue';
import PrivacyPolicyModal from '@/modules/home/components/PrivacyPolicyModal.vue';
import { usePostHog } from '@/composables/usePostHog';
import { useUserStore } from '@/stores/user'


export default defineComponent({
    name: 'ValuePropositionMainView',
    components: {
        ImageComponent, LogoComponent, Tooltip, iconDragDrop, CalculumLoading, 
        SpendVolumeComponent, AskQuestions, SendInvitations, IndustryComponent, SustancialAmount, LowHangingFruits, CatalogContentSelector,
        IntroductionComponent, YourValuePropositionComponent, SubtitleComponent, MatchComponent, SpendVolumeDistributed, ValidateVpPassword, SetNewPassword, TextComponent, AnalyzedSupplierContent, SelectSupplier, StickyHeaderWrapper, CookiesModal, PrivacyPolicyModal
    },
    props: {
        valuePropositionId: {
            type: String,
            default: null
        }
    },
    setup(props: any) {
        const route = useRoute()
        const draggedTabIndex = ref(null)
        const getSectionsForTabs = ref<Sections[]>([])
        const spendFilesStore = useSpendFilesStore()
        const userStore = useUserStore()
        const valuePropositionStore = useValuePropositionStore()
        const { user, userIsSuperAdmin, userIsAdmin, userPartnerRoleEnabled } = useUser()
        const { spendFileVersionActiveId } = useSpendFile()
        const toast = useToast()
        const posthog=usePostHog()
        const selectedSupplierFormList = ref<PropsSelectedSupplier | null>(null)
        let removeStickyListener: (() => void) | undefined
        const { programSelectedId } = useProgram()
        interface DataInterface {
            showMenuMobileOptions: boolean,
            jsonData: JsonDataInterface,
            jsonDataInitial: JsonDataInterface,
            editionMode: boolean,
            loadingData: boolean,
            loadingNewContent: boolean,
            guessWithOutInvitation: boolean,
            showModal: boolean,
            keyRenderComponent: number,
            showModalContent: boolean,
            showModalContentSelectSupplier: boolean,
            addContentToThisSection: string | null
            contentTypes: CatalogType[],
            showAskQuestions: boolean,
            invitationId: string | null,
            showSendInvitations: boolean,
            emailInvitation: string
            isPublic: boolean,
            externalUser: boolean,
            showValidatePassword: boolean,
            showResetPassword: boolean,
            thePasswordIsValid: boolean,
            userPassword: string | null,
            passwordExpired: boolean,
            showCookieModal: boolean,
            openPrivacyPolicy: boolean,
            cookiesOption: boolean | null
        }

        const data = reactive<DataInterface>({
            showMenuMobileOptions: false,
            editionMode: false,
            jsonData: defaultJsonDataDemo,
            jsonDataInitial: defaultJsonDataDemo,
            loadingData: true,
            loadingNewContent: false,
            guessWithOutInvitation: false,
            showModal: false,
            keyRenderComponent: new Date().getUTCMilliseconds(),
            showModalContent: false,
            showModalContentSelectSupplier: false,
            addContentToThisSection: null,
            contentTypes: catalog,
            showAskQuestions: false,
            invitationId: null,
            showSendInvitations: false,
            emailInvitation: '',
            isPublic: true,
            externalUser: false,
            showValidatePassword: false,
            showResetPassword: false,
            thePasswordIsValid: false,
            userPassword: null,
            passwordExpired: false,
            showCookieModal: false,
            openPrivacyPolicy: false,
            cookiesOption: null

        })

        function validateMenuMobileOptions() {
            if (data.showMenuMobileOptions) {
                data.showMenuMobileOptions = false
            }
        }
        const timeTracking=reactive<{initial:Date,currentTab:string}>({
            initial:new Date(),
            currentTab:''
        })
        const changeTabPosthog=(idTab:string,type:'close'|'tab')=>{
            const sectionName=getSectionNameById(idTab)    
            const now = new Date()
            const timeSpent = now.getTime() - timeTracking.initial.getTime() // in miliseconds        
            if (sectionName && type==='tab') {
                if (sectionName!==timeTracking.currentTab) {                    
                    sendToPosthog('vp_scroll',timeTracking.currentTab,timeSpent)
                    timeTracking.initial=now
                    timeTracking.currentTab=sectionName                    
                }
            } else if (type==='close') {
                sendToPosthog('vp_scroll',timeTracking.currentTab,timeSpent)
                sendToPosthog('vp_close',timeTracking.currentTab,null)
            }
            
        }
        function initScrollSpyTabs() {
            const tabLinks = document.querySelectorAll<HTMLAnchorElement>('a.nav-link');
            const sections = document.querySelectorAll<HTMLElement>('.section-vp');
            const contentSection = document.querySelector<HTMLElement>('.content-section');

            if (!tabLinks.length || !sections.length || !contentSection) return;

            const activateTabById = (id: string) => {
                changeTabPosthog(id,'tab')
                const tabToActivate = Array.from(tabLinks).find(link => link.getAttribute('href') === `#${id}`);
                if (tabToActivate) {
                    tabLinks.forEach(link => link.classList.remove('active'));
                    tabToActivate.classList.add('active');
                }
            };

            const onScroll = () => {
                let currentSectionId = '';
                const scrollPosition = contentSection.scrollTop + 120;

                sections.forEach(section => {
                    const sectionTop = section.offsetTop;
                    if (scrollPosition >= sectionTop) {
                        currentSectionId = section.id;
                    }
                });

                if (currentSectionId) {                    
                    
                    activateTabById(currentSectionId);
                }
            };
            contentSection.addEventListener('scroll', onScroll);

            tabLinks.forEach(link => {
                link.addEventListener('click', event => {
                    event.preventDefault();


                    const targetId = link.getAttribute('href')?.replace('#', '');
                    if (!targetId) return;

                    activateTabById(targetId);
                    const section = document.getElementById(targetId);
                    if (section) {

                        section.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                });
            });
        }
        const getSectionNameById=(id:string)=>{
            const sectionID=id.split("section-")[1]
            const section=data.jsonData.sections.find(section=>section.id===sectionID)?.tabTitle || 'no section'
            return section
        }
        
        const sendToPosthog=(eventName:string,section:string,timeSpent:number|null)=>{
            const dataSend:TrackingProp={
            vpIdentity:props.valuePropositionId,
            vpEmail:data.emailInvitation,
            vpSectioName:section
            }
            if(timeSpent){
                dataSend.duration=timeSpent
            }
            if (dataSend.vpEmail && dataSend.vpSectioName && dataSend.vpIdentity) {
                posthog.capture(eventName,dataSend)
            }
        }

        const initTracking=(track:boolean|null)=>{
            
            if (track === true) {                
                if(import.meta.env.DEV) console.log('Tracking activity started')
                posthog.opt_in_capturing();
                sendToPosthog('page_view',timeTracking.currentTab,null)
                sendToPosthog('vp_enter',timeTracking.currentTab,null)                
            } 
        }
        const handleBeforeUnload=(event:BeforeUnloadEvent)=>{
            changeTabPosthog('vp_close','close')
        }
        onMounted(() => {   
            window.addEventListener('beforeunload',handleBeforeUnload)
            userStore.setLastSectionVisitedbyUser(null)
            userStore.setGuardURI(null)

            if (!isNullOrUndefined(route.query['invitation_id'])) {
                const rawValue = route.query['invitation_id'];
                data.invitationId = Array.isArray(rawValue) ? rawValue[0] : rawValue ?? null;
            }

            data.loadingData = true
            if (isNullOrUndefined(user.value) && isNullOrUndefined(data.invitationId)) {
                data.guessWithOutInvitation = true
                data.editionMode = false
                data.loadingData = false
                data.passwordExpired = false
                data.thePasswordIsValid = true
                data.guessWithOutInvitation = true
            } else if (!isNullOrUndefined(data.invitationId)) {
                data.editionMode = false                
                validateInvitationForExternalUser()
            }
            else {                
                data.editionMode = true
                data.thePasswordIsValid = true
                data.cookiesOption = false
                data.showCookieModal = false
                validateValuePropositionForInternalUsers()
            }

        })

        onUnmounted(() => {
            window.removeEventListener('beforeunload',handleBeforeUnload)
            // Limpia el listener al desmontar
            if (removeStickyListener) {
                removeStickyListener()
            }
        })

        function validateValuePropositionForInternalUsers() {
            const params = {
                valuePropositionId: props.valuePropositionId,
                callbackSuccess: (callBackSucess: any) => {

                    data.loadingData = false
                    data.jsonDataInitial = ObjectUtils.cloneDeep(callBackSucess[0])
                    data.jsonData = callBackSucess[0]
                    data.isPublic = data.jsonData.isPublic
                    document.title = data.jsonData.name;
                    data.externalUser = false
                    data.keyRenderComponent++
                    userStore.setLastSectionVisitedbyUser(null)
                    userStore.setGuardURI(null)
                    setTimeout(() => {
                        initScrollSpyTabs()
                        loadData()
                    }, 500)
                    
                },
                callbackError: () => {
                    data.guessWithOutInvitation = true
                    data.editionMode = false
                    data.loadingData = false
                }
            }
            spendFilesStore.validateValuePropositionForInternalUsers(params)
        }


        function validateInvitationForExternalUser() {            
            data.loadingData = true
            CompanyApi.validateValuePropositionInvitation(
                props.valuePropositionId,
                data.invitationId,
                userStore.getTokenForExternalVPUser

            ).then(async (response: ApiResponse) => {


                if (import.meta.env.DEV) console.log("** response", response)                
                data.jsonDataInitial = ObjectUtils.cloneDeep(response.data[0])
                data.jsonData = response.data[0]
                document.title = data.jsonData.name;
                data.externalUser = true
                data.keyRenderComponent++
                data.isPublic = data.jsonData.isPublic
                data.guessWithOutInvitation = false
                data.passwordExpired = false
                data.thePasswordIsValid = true
                data.cookiesOption = false
                timeTracking.currentTab=data.jsonData.sections[0].tabTitle
                getInvitationDetails()
                

                setTimeout(() => {
                    initScrollSpyTabs()
                    loadData()
                }, 500)
                

            }).catch((error) => {
                const errorCode = error.response?.data?.errorCode

                if (errorCode === 'Authorization') {
                    data.showValidatePassword = true
                    data.thePasswordIsValid = false
                }

                if (errorCode === 'RequireChangePassword') {
                    data.showResetPassword = true
                    data.passwordExpired = false
                }

                if (errorCode === 'EntityNotFound') {
                    data.showResetPassword = false
                    data.passwordExpired = false
                    data.thePasswordIsValid = true
                    data.isPublic = false
                }

                data.guessWithOutInvitation = true
                data.editionMode = false
                data.loadingData = false
            })
        }



        function setCookieSelectedOption(option: any) {            
            // data.loadingData = true
            data.showCookieModal = false
            CompanyApi.setCookieSelectedOption(
                props.valuePropositionId,
                data.invitationId,
                userStore.getTokenForExternalVPUser,
                option
            ).then(async (response: ApiResponse) => {
                if (import.meta.env.DEV) console.log("** response", response)                       
                data.cookiesOption = option                
                initTracking(data.cookiesOption)
                // validateInvitationForExternalUser()
            }).catch((error) => {
                toast.error("Erros saving Cookies Settings")
                data.guessWithOutInvitation = true
                data.editionMode = false
                data.loadingData = false
                data.cookiesOption = null
            })
        }



        function getInvitationDetails() {

            if (isNullOrUndefined(data.invitationId)) return
            CompanyApi.getInvitationDetails(
                data.invitationId,
                props.valuePropositionId,
                userStore.getTokenForExternalVPUser

            ).then(async (response: ApiResponse) => {
                if (import.meta.env.DEV) console.log("** response", response)
                data.emailInvitation = response.data['email']
                data.cookiesOption = response.data['trackingCookies']
                data.loadingData = false
                if (data.cookiesOption === null) {
                    data.showCookieModal = true
                } else if (data.cookiesOption === true) {
                    initTracking(data.cookiesOption)
                }
                //-After this line, we need to check if the cookiesOption is true or false, if it is true, we need to track the VP with the cookies
            
            }).catch((error) => {
                console.error(error)
            })
        }

        function setVPNameInGrid(name: string) {
            const params = {
                uuid: props.valuePropositionId,
                valuePropositionName: name,
                callbackSuccess: () => {

                },
                callbackError: () => {
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                }
            }
            valuePropositionStore.setNameInGridValueProposition(params)
        }


        function setPersistValuePropositionJson() {
            if (!isNullOrUndefined(data.invitationId)) return
            const params = {
                uuid: props.valuePropositionId,
                valuePropositionData: [data.jsonData],
                callbackSuccess: () => {

                },
                callbackError: () => {
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                }
            }
            valuePropositionStore.setPersistValuePropositionJson(params)
            setVPNameInGrid(data.jsonData.name)
        }

        function generateUUID() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = getRandomNumberSafer() * 16 | 0;
                const v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        function requestNewContent(type: ContentTypes["type"]): void {
            data.showModalContent = false
            let newId = generateUUID()
            const sections = data.jsonData.sections.find(sec => sec.id === data.addContentToThisSection);
            if (!sections) {
                console.error(`Section with id ${data.addContentToThisSection} not found`);
                return;
            }
            const isLocalContent = localContentTypes(newId, type)
            if (isLocalContent) {
                sections.contents.push(isLocalContent());
            } else if (contentTypeSource[type] !== "local") {
                requestNewContentApi(type);
            } else {
                console.error(`Unknown content type: ${type}`);
            }
        }


        function requestNewContentApi(type: any) {
            data.loadingNewContent = true
            let supplierUuid = selectedSupplierFormList.value?.uuid || null
            const params = {
                type: type,
                valuepropositionId: props.valuePropositionId,
                spendFileVersionUuid: spendFileVersionActiveId.value,
                activeProgramDefaultId: programSelectedId.value,
                supplierUuid: supplierUuid,
                callbackSuccess: (callBackSucessData: any) => {
                    const sections = data.jsonData.sections.find(sec => sec.id === data.addContentToThisSection);
                    if (sections) {
                        const cleanData = typeof callBackSucessData === 'string'
                            ? extractCleanJson(callBackSucessData)
                            : callBackSucessData;
                        sections.contents.push(cleanData)
                    }
                    data.loadingNewContent = false
                    if(type==='analyzedSupplierName'){
                        requestNewContentApi('analyzedSupplier')
                    }
                },
                callbackError: () => {
                    if (!programSelectedId.value) {
                        toast.error("You must have selected a program");
                    }
                    if (import.meta.env.DEV) console.error('** Error, cannot set invitation')
                    data.loadingNewContent = false
                }
            }
            valuePropositionStore.requestNewContent(params)
        }

        function cancelAddContent(): void {
            data.addContentToThisSection = null
            data.showModalContent = false
        }

        const cancelSelectSupplier = () => data.showModalContentSelectSupplier = false

        function requestSelectSupplier(): void {
            data.showModalContent = false
            data.showModalContentSelectSupplier = true
        }

        const requestContent = (type: ContentTypes["type"]) => type === 'analyzedSupplier' ? requestSelectSupplier() : requestNewContent(type)

        function openContentModal(sectionId: string): void {
            data.addContentToThisSection = sectionId
            data.showModalContent = true
        }

        function selectedSupplier(option: any) {
            data.showModalContentSelectSupplier = false
            selectedSupplierFormList.value = option
            requestNewContent('analyzedSupplierName')
        }


        const changeContent = (dataContent: ContentTypes['contents'], newValue: any, action: ContentTypes["type"] | "showOrHide" | "delete"): void => {
            const sections = data.jsonData.sections.find(sec =>
                sec.contents.some(content => content.id === dataContent.id)
            );
            const contentIndex = sections?.contents.findIndex(content => content.id === dataContent.id)
            if (contentIndex !== undefined && contentIndex !== -1 && sections) {
                if (contentTypeCastMap[action as ContentTypes["type"]]) {
                    (sections.contents[contentIndex] as ContentTypes['contents']) = newValue.obj;
                } else if (action === "showOrHide") {
                    sections.contents[contentIndex].visibility = !sections.contents[contentIndex].visibility;
                } else if (action === "delete") {
                    sections.contents.splice(contentIndex, 1)
                }
            }

            data.keyRenderComponent++

        };

        function deleteSection(sectionId: string): void {
            const index = data.jsonData.sections.findIndex(sec => sec.id === sectionId);
            if (index !== -1) {
                data.jsonData.sections.splice(index, 1);
            }
        }



        function changePublicStatus() {
            const params = {
                uuid: "/api/value_propositions/" + props.valuePropositionId,
                isPublic: !data.jsonData.isPublic,
                callbackSuccess: () => {
                    data.jsonData.isPublic = !data.jsonData.isPublic
                },
                callbackError: () => {
                    toast.error("Something went wrong, please try again");

                },
            };
            spendFilesStore.setStatusforValueProposition(params);
        }


        const getSectionsForContent = computed(() => {
            if (!data.editionMode) {
                return data.jsonData.sections
                    .filter((section: any) => section?.visibility === true)
            }
            return data.jsonData.sections
        })


        function changeMainLogos(newUrl: string, type: string) {
            if (type === 'company-logo') {
                data.jsonData.companyLogo = newUrl

            } else {
                data.jsonData.partnerLogo = newUrl
            }

            data.keyRenderComponent++
            setPersistValuePropositionJson()

        }

        function addSection() {
            let newId = generateUUID()
            data.jsonData.sections.push(newSection(newId))

            setTimeout(() => {
                initScrollSpyTabs()
            }, 500)
        }


        /**
         * Only watch when the jsonData.sections is changed
         */

        watch(
            () => data.jsonData.sections.map(section => section.contents),
            () => {
                setPersistValuePropositionJson();
            },
            { deep: true }
        );


        watchEffect(() => {
            if (!data.jsonData?.sections) return

            const rawSections = data.jsonData.sections as Sections[]

            getSectionsForTabs.value = data.editionMode
                ? rawSections.map(({ id, tabTitle, visibility, contents }) => ({ id, tabTitle, visibility, contents }))
                : rawSections
                    .filter(section => section?.visibility === true)
                    .map(({ id, tabTitle, visibility, contents }) => ({ id, tabTitle, visibility, contents }))

            setTimeout(() => {
                initScrollSpyTabs()
            }, 500)

        })




        function handleDragStart(index: any) {
            if (!data.editionMode) return
            draggedTabIndex.value = index
        }


        function handleDrop(dropIndex: any) {
            const fromIndex = draggedTabIndex.value
            if (fromIndex === null || fromIndex === dropIndex) return

            const updatedTabs = [...getSectionsForTabs.value]
            const movedTab = updatedTabs.splice(fromIndex, 1)[0]
            updatedTabs.splice(dropIndex, 0, movedTab)

            syncTabsOrder(updatedTabs)


            getSectionsForTabs.value = updatedTabs
            draggedTabIndex.value = null
        }

        function syncTabsOrder(newOrder: Sections[]) {
            getSectionsForTabs.value = newOrder
            const newOrderIds = newOrder.map(s => s.id)

            const reorderedSections = [...data.jsonData.sections].sort((a, b) => {
                const aIndex = newOrderIds.indexOf(a.id)
                const bIndex = newOrderIds.indexOf(b.id)
                return aIndex - bIndex
            })
            data.jsonData.sections = reorderedSections

            setTimeout(() => {
                initScrollSpyTabs()
            }, 500)
        }

        function cancelValidatePassword() {
            data.showValidatePassword = false
            data.guessWithOutInvitation = true
            data.loadingData = false
        }


        const showControls = computed(() => {
            if (!isNullOrUndefined(data.invitationId) || isNullOrUndefined(user.value)) {
                return false
            }
            if (userIsSuperAdmin.value || (userIsAdmin.value && userPartnerRoleEnabled.value)) {
                return true
            } else {
                return false
            }
        })

        function closeResetPassworModal() {
            data.showResetPassword = false
            data.passwordExpired = true
        }

        function setToken(token: string) {
            userStore.setTokenForExternalVPUser(token)

            data.showValidatePassword = false
            data.showResetPassword = false
            validateInvitationForExternalUser()
        }
       
        const loadData = async () => {
            await nextTick()
            initStickyScrollListener({
                scrollContainerSelector: '.content-section',
                stickyTitleClass: 'sticky-active-title',
                stickySubtitleClass: 'sticky-active-subtitle',
                offset: 0,
                subtitleOffset: null
            });
        }
        const getTabVisibility = (tab: Sections) => tab.visibility ? 'enabled' : 'disabled'
        const sectionVisibility = (type: 'hide' | 'show',section:Sections) =>{ 
            if(type !== 'hide'){
               return section.visibility = true
            }else{
                return section.visibility = false
            }
        }

        function clearSections() {
            userStore.setLastSectionVisitedbyUser(null)
            userStore.setGuardURI(null)
        }

        return {
            ...toRefs(data),
            validateMenuMobileOptions,
            getSectionsForTabs,
            getTabVisibility,
            getSectionsForContent,
            changeMainLogos,
            openContentModal,
            deleteSection,
            addSection,
            handleDragStart,
            handleDrop,
            showControls,
            images,
            requestNewContent,
            cancelAddContent,
            changeContent,
            setPersistValuePropositionJson,
            changePublicStatus,
            cancelValidatePassword,
            closeResetPassworModal,
            user,
            setToken,
            requestContent,
            cancelSelectSupplier,
            selectedSupplier,
            spendFileVersionActiveId,
            contentTypeCastMap,
            sectionVisibility,
            clearSections,
            validateInvitationForExternalUser,
            setCookieSelectedOption
        }
    }


})
</script>

<style lang="scss" scoped>
.mobile-menu-container {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.2);
    z-index: 98;
}



#app {
    background: #4a5578 !important;
}

.logo-section {
    display: flex;
    align-items: center;
    height: 70px;
    background-color: #fff;
    width: 100%;
    padding: 0px 5px;
}

.tabs-section {
    display: flex;
    align-items: center;
    height: auto;
    width: 100%;
    padding: 20px 5px;
}

.content-section {
    width: 100%;
    height: 125vh;
    overflow-x: hidden;
    overflow-y: auto;
    padding: 0px 16px 0px 16px;
    display: block;
    position: relative; 

    @media screen and (max-width: 1600px) {
        height: calc(125vh - 10vh);
    }

    @media screen and (max-width: 1350px) {
        height: calc(125vh - 15vh);
    }

    @media screen and (max-width: 1000px) {
        height: calc(125vh - 20vh);
    }

}

html,
body {
    scroll-behavior: smooth;
}


main {
    width: 100%;
}

main.scroll-section {
    position: relative;
}



#menu-wrapper {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}


@media (min-width: 992px) {
    #menu-mobile {
        display: none !important;
    }

    .navbarNav {
        display: flex !important;
    }
}


@media (max-width: 991.98px) {
    #menu-mobile {
        display: block !important;
    }

    .navbarNav {
        display: none !important;
    }
}


.mobile-menu {
    position: absolute;
    top: 0;
    left: auto;
    background-color: white;
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 50%;
    z-index: 99;
    height: 100vh;
    box-shadow: 0px 0px 10px 0px rgba(34, 60, 80, 0.2);

    a {
        color: #000;
        font-size: 0.75rem !important;
        line-height: 1rem;
        font-weight: 400;
    }

}

.top-menu-contaier {
    align-content: center;
}

.mobile-menu-title {
    padding: 12px 12px;
    border-bottom: 1px solid #d1d1d1;
}

.top-buttons-container {
    justify-content: start;
}

.mobile-menu-options {
    padding: 12px 12px;
    gap: 8px;
}


.slide-fade-enter-active,
.slide-fade-leave-active {
    transition: all 0.3s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
    opacity: 0;
    transform: translateX(-100%);
}

.slide-fade-enter-to,
.slide-fade-leave-from {
    opacity: 1;
    transform: translateX(0);
}

/** buttons */


.button {
    padding: 8px 8px;
    font-size: 12px;
    font-weight: bold;
    color: white;
    border: none;
    cursor: pointer;
    width: fit-content;
    border-radius: 6px;
    transition: background-color 0.3s ease, transform 0.2s ease;
    white-space: nowrap;
    text-align: center;

    @media (max-width: 991.98px) {
        padding: 6px 6px;
        font-size: 10px;
    }
}

.button.ask {
    background-color: #1a1a4b;
}

.button.ask:hover {
    background-color: #333366;
    transform: scale(1.05);
}

.button.share {
    background-color: #ff2c4f;
}

.button.share:hover {
    background-color: #ff6666;
    transform: scale(1.05);
}


.disabled {
    a {
        color: #98a2b3 !important;
    }
}

input.change-tab-title-section {
    border: none;
    background-color: transparent;
    width: 100%;
    font-size: 1.5rem !important;
    line-height: 2rem;
    font-weight: 700;
    padding: 10px 0px;
}


input.change-title-section {
    border: none;
    background-color: transparent;
    width: 100%;
    font-size: 1.5rem !important;
    line-height: 1.25rem;
    font-weight: 700;
    padding: 15px 0px;
}

input.editable {
    padding: unset !important;
}

input.editable:hover {
    border: 2px solid #ccc;
    border-radius: 8px;
    transition: all 0.3s ease;
    outline: none;
    background-color: white;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
    padding: unset !important;
}

input.editable:focus {
    border: 2px solid #ccc;
    border-radius: 8px;
    transition: all 0.3s ease;
    outline: none;
    background-color: white;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
    padding: unset !important;
}



input.change-name-vp {
    border: none;
    background-color: transparent;
    font-size: 1.125rem !important;
    line-height: 1.75rem;
    font-weight: 700;
}

input.editableTitle:hover {
    border: 2px solid #ccc;
    border-radius: 8px;
    transition: all 0.3s ease;
    outline: none;
    background-color: white;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);

}

input.editableTitle:focus {
    border: 2px solid #ccc;
    border-radius: 8px;
    transition: all 0.3s ease;
    outline: none;
    background-color: white;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.1);
}


.container-center-logos {
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
}


.icon {
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    font-size: 18px;


    &-subsection {
        width: 30px;
        height: 30px;
    }



    &-controls {
        width: 25px;
        height: 25px;
        background-color: #ff2c4f;

        &:hover {
            background-color: #ff2c4f !important;
            transform: rotate(360deg);
        }
    }

    &-controls-private {
        width: 25px;
        height: 25px;
        background-color: #73e2a3;

        &:hover {
            background-color: #73e2a3 !important;
            transform: rotate(360deg);
        }
    }



    &:hover {
        background-color: rgba(0, 0, 0, 0.9);
        transform: rotate(360deg);
    }
}



.actions-by-section {
    justify-content: end;
}

.section-vp {
    min-height: 350px;
    background: #f2f4f7 !important;
    padding: 1rem;
    margin-bottom: 1.5rem;
    border-radius: 16px;
}

.add-content {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 50px;
    border: 2px dashed #ff2c4f;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    font-weight: bold;
    color: #ff2c4f;
    font-size: 16px;
    gap: 10px;
    margin-bottom: 25px;
    background: #ffffff;

}

.add-content:hover {
    color: #ff2c4f;
    box-shadow: 0 4px 10px rgba(0, 115, 170, 0.2);
}

.add-icon {    
    transition: transform 0.3s ease;
}

.add-content:hover .add-icon {
    transform: rotate(90deg);
}


.container,
.container-fluid,
.container-xl,
.container-lg,
.container-md,
.container-sm {
    width: 100%;
    padding-right: 0px !important;
    padding-left: 0px !important;
    margin-right: auto;
    margin-left: auto;
}

.container-vp {
    width: 100%;
    display: block;
    background-color: #f9fafb;

}

.error-section {
    height: 100vh;
    align-content: center;
    justify-content: center;
    align-items: center;
    display: flex;
}

span.label-topbar {
    font-style: normal;
    font-weight: 400 !important;
    font-size: 12px !important;
    line-height: 18px !important;
    color: #98a2b3 !important;
    flex: none;
    order: 0;
    flex-grow: 0;
    margin-bottom: unset !important;
}

.currency-section {
    justify-content: center;
}

.controls {
    align-items: center;
}

.text-xs {
    line-height: 0px !important;
}

@media print {

    html,
    body,
    #app,
    .container-vp {
        height: auto !important;
        min-height: 0 !important;
        overflow: visible !important;
        display: block !important;
        position: static !important;
        width: 100% !important;
    }

    .container-vp>.container {
        height: auto !important;
        overflow: visible !important;
        display: block !important;
        page-break-inside: avoid;
    }

    .content-section,
    .show-scroll {
        height: auto !important;
        overflow: visible !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }

    .section-vp {
        page-break-after: auto;
        page-break-inside: avoid;
        break-inside: avoid;
    }

    .no-print,
    .mobile-menu-container,
    .add-content,
    .icon {
        display: none !important;
    }

    * {
        visibility: visible !important;
        opacity: 1 !important;
    }
}

.space-between-sections {
    margin-top: 50px;
}

// Estilos para headers sticky
.sticky-header-wrapper {
    transition: all 0.3s ease;
    
    &.sticky-active {
        background: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-radius: 8px;
        margin: 0 -1rem;
        padding: 1rem;
        // position: sticky;
        top: 120px;
        z-index: 100;
        
        .change-tab-title-section {
            background: transparent;
            border: none;
            font-weight: 700;
            font-size: 1.5rem;
            color: #1f2937;
        }
        
        .subtitle-content {
            background: transparent;
            border: none;
            font-weight: 700;
            font-size: 1.2rem;
            color: #374151;
        }
    }
}

// Animación suave para la transición sticky
.sticky-header-wrapper {
    transform: translateY(0);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    &.sticky-active {
        transform: translateY(0);
    }
}

// Mejoras visuales para los headers cuando están sticky
.sticky-active {
    .row.space-between-sections {
        margin-top: 0;
        padding: 0.5rem 0;
    }
    
    .actions-by-section {
        opacity: 1;
        transition: opacity 0.3s ease;
    }
}
</style>