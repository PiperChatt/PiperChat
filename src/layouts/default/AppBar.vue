<template>
  <v-app-bar density="compact" order="-1">
    <div class="main-search tw-flex tw-row-auto tw-grow tw-justify-center tw-h-full">
      <div class="tw-text-white tw-bg-zinc-800 tw-w-8/12 tw-h-3/4 tw-m-auto">
        <v-input></v-input>
      </div>
    </div>
    <div class="tw-flex tw-row-auto">
      <h2 class="tw-pl-5">Amigos</h2>
      <v-divider vertical class="tw-pl-5"></v-divider>
    </div>
  </v-app-bar>
</template>

<script setup>
import { useLayout } from 'vuetify'

const { getLayoutItem } = useLayout()

function print() {
  alert(JSON.stringify(getLayoutItem("drawer"), null, 2))
}
</script>


<style>
.v-app-bar {
  box-shadow: 0 1px 0 hsl(0 calc(1*0%) 0.8%/0.2), 0 1.5px 0 hsl(240 calc(1*7.7%) 2.5%/0.05), 0 2px 0 hsl(0 calc(1*0%) 0.8%/0.05) !important;
}

.main-search {
  max-width: 240px !important;
  background-color: #2c2d31 !important;
}

</style>
//1e1f22
