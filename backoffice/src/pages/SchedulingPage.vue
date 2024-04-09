<script>
import Scheduler from "../components/scheduler/Scheduler.vue";
import SchedulerLogs from "../components/scheduler/SchedulerLogs.vue";

export default {
    components: {
        Scheduler,
        SchedulerLogs
    }
};
</script>

<template>
<main class="page scheduling-page">
    <scheduler/>
    <scheduler-logs/>
</main>
</template>

<style>
main.scheduling-page {
    flex-direction: row;
    align-content: flex-start;
    justify-items: flex-start;
    box-sizing: border-box;
    flex-wrap: wrap;
}
.scheduling-page > div {
    box-sizing: border-box;
    padding: 20px;
    background: var(--white-color);
    border-radius: 10px;
}
</style>
