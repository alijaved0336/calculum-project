import type { Preview } from '@storybook/vue3';
import { setup } from '@storybook/vue3';
import InlineSvg from 'vue-inline-svg';
import '../src/styles/tokens.css';
import '../src/styles/base.scss';
import '../src/styles/kendo-theme.css';
import '../src/styles/dropdown-surface.scss';
import '../src/styles/disabled-state.scss';
import '../src/styles/kendo-inputs.scss';
import '../src/styles/kendo-tooltip.scss';
import '../src/styles/kendo-dialog.scss';
import '../src/styles/kendo-grid.scss';

setup((app) => {
  app.component('InlineSvg', InlineSvg);
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
};

export default preview;
