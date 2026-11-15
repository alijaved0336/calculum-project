
import * as Routing from "@/services/router/Routing";
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

export const sectionTogo = () => {

    const router = useRouter();
    const userStore = useUserStore()

    const sectionToGo = userStore.getLastSectionVisitedbyUser
    
    switch (sectionToGo) {        
        case 'home':
            Routing.home.openHome();
            break;

        case 'analyze':
            Routing.home.categorize.openHomeCategorize()
            break;        
        
        case 'plan':
            Routing.home.plan.openHomePlanAllPlans()
            break;
        
        case 'manage':
            Routing.home.manageModule.openHomeManageModule()
            break;

        case 'suppliers':
            Routing.home.entityCard.openEntityCard()
            break;

        case 'compare':
            Routing.home.compare.openHomeCompare()
            break;

        case 'match':
            Routing.home.overview.openHomeOverview()
            break;

        case 'settings':
            Routing.home.openHomeCompanySettings()
            break;

        default:
            Routing.home.analyze.openHomeAnalyzeProgramsPanel()
            break;
    }

}

