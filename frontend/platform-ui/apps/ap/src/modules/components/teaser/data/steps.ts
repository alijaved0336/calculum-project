// src/modules/components/teaser/data/steps.ts

export interface Steps {
  headerTitle: string;
  text?: string;
  step: number;
  list?: string[];
}

export const stepsData: Record<string, Steps[]> = {
  manageTeaser: [
    {
      headerTitle: 'global.teaser.manageTeaser.whatYouGet.step1Bold',
      text: 'global.teaser.manageTeaser.whatYouGet.step1',
      step: 1
    },
    {
      headerTitle: 'global.teaser.manageTeaser.whatYouGet.step2Bold',
      text: 'global.teaser.manageTeaser.whatYouGet.step2',
      step: 2
    },
    {
      headerTitle: 'global.teaser.manageTeaser.whatYouGet.step3Bold',
      text: 'global.teaser.manageTeaser.whatYouGet.step3',
      step: 3
    }
  ],
  emailNegotiations: [
    {
      headerTitle: 'global.teaser.emailNegotiations.whatYouGet.section1.title',
      step: 1,
      list: [
        'global.teaser.emailNegotiations.whatYouGet.section1.bullet1',
        'global.teaser.emailNegotiations.whatYouGet.section1.bullet2',
        'global.teaser.emailNegotiations.whatYouGet.section1.bullet3'
      ]
    },
    {
      headerTitle: 'global.teaser.emailNegotiations.whatYouGet.section2.title',
      step: 2,
      list: [
        'global.teaser.emailNegotiations.whatYouGet.section2.bullet1',
        'global.teaser.emailNegotiations.whatYouGet.section2.bullet2'
      ]
    }
  ],
  nineBoxesFinancing: [
    {
      headerTitle: 'global.teaser.nineBoxesFinancing.whatYouGet.section1.title',
      step: 1,
      list: [
        'global.teaser.nineBoxesFinancing.whatYouGet.section1.bullet1'
      ]
    },
    {
      headerTitle: 'global.teaser.nineBoxesFinancing.whatYouGet.section2.title',
      step: 2,
      list: [
        'global.teaser.nineBoxesFinancing.whatYouGet.section2.bullet1'
      ]
    },
    {
      headerTitle: 'global.teaser.nineBoxesFinancing.whatYouGet.section3.title',
      step: 3,
      list: [
        'global.teaser.nineBoxesFinancing.whatYouGet.section3.bullet1'
      ]
    }
  ],
  entityCardCalculator: [
    {
      headerTitle: 'global.teaser.entityCardCalculator.whatYouGet.section1.title',
      step: 1,
      list: [
        'global.teaser.entityCardCalculator.whatYouGet.section1.bullet1',
        'global.teaser.entityCardCalculator.whatYouGet.section1.bullet2'
      ]
    },
    {
      headerTitle: 'global.teaser.entityCardCalculator.whatYouGet.section2.title',
      step: 2,
      list: [
        'global.teaser.entityCardCalculator.whatYouGet.section2.bullet1',
        'global.teaser.entityCardCalculator.whatYouGet.section2.bullet2'
      ]
    },
    {
      headerTitle: 'global.teaser.entityCardCalculator.whatYouGet.section3.title',
      step: 3,
      list: [
        'global.teaser.entityCardCalculator.whatYouGet.section3.bullet1',
        'global.teaser.entityCardCalculator.whatYouGet.section3.bullet2'
      ]
    },
    {
      headerTitle: 'global.teaser.entityCardCalculator.whatYouGet.section4.title',
      step: 4,
      list: [
        'global.teaser.entityCardCalculator.whatYouGet.section4.bullet1'
      ]
    }
    
  ]
};
