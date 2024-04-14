/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'discord',
    themes: {
      discord: {
        colors: {
          primary: '#5865f2',
          secondary: '#4f545c',
          background: '#323338',
          surface: '#323338',
          info: '#4f545c',
          error: '#ed4245',
        },
      },
    },
  },
})
