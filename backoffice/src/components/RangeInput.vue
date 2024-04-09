<script>
export default {
    props: {
        ranges: {
            type: Array
        }
    },

    mounted() {
        if (!this.ranges.length)
            this.ranges.push({to: null, percent: 0});
    },

    methods: {
        addRange() {
            const {length} = this.ranges;

            if (length >= 1024)
                return;

            const value = this.ranges[length - 2]?.to || 0;
            const delta = Math.pow(10, Math.trunc(Math.log10(value || 10000)));

            this.ranges[length - 1].to = value + delta;

            this.ranges.push({
                to: null,
                percent: 0
            });
        },

        removeRange(i) {
            if (this.ranges.length < 2)
                return;

            this.ranges.splice(i, 1);
            this.ranges[this.ranges.length - 1].to = null;
        }
    }
};
</script>

<template>
    <div class="range-picker">
        <transition-group tag="div" class="ranges" name="range">
            <div v-for="(range, i) in ranges" :key="range" class="range" :class="{
                    'invalid-range': range.to === '' ||
                        i < ranges.length - 1
                        && (ranges[i - 1]?.to || 0) >= ranges[i].to
                }">
                <label>From:</label>
                <input
                    v-if="i"
                    type="number"
                    class="range-input"
                    min="0"
                    step=".01"
                    required
                    :value="ranges[i - 1].to / 100"
                    :placeholder="ranges[i - 2]?.to || 0"
                    @change="e => { ranges[i - 1].to = e.target.value * 100; }"
                />
                <input v-else class="range-input" placeholder="0" disabled/>
                <label>To:</label>
                <input
                    v-if="i != ranges.length - 1"
                    type="number"
                    class="range-input"
                    min="0"
                    step=".01"
                    required
                    :value="range.to / 100"
                    :placeholder="ranges[i - 1]?.to || 0"
                    @change="e => { range.to = e.target.value * 100; }"
                />
                <input v-else class="range-input" placeholder="∞" disabled/>
                <label>%:</label>
                <input
                    v-model="range.percent"
                    :class="{
                    'invalid-percent': range.percent === ''
                        || Math.trunc(range.percent) != range.percent
                        || range.percent < 0
                        || range.percent > 100
                    }"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
                />
                <button
                    v-if="ranges.length > 1"
                    type="button"
                    class="mini-button action-delete"
                    @click="() => removeRange(i)"
                />
            </div>
        </transition-group>
        <button type="button" class="add-range-button" @click="addRange">Add Range</button>
    </div>
</template>

<style>
.range-picker {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
.range-picker .range {
    display: flex;
    align-items: center;
    font-weight: bold;
    width: 100%;
    gap: 10px;
    max-height: 50px;
    padding: 5px;
    overflow-y: hidden;
    transition: all .2s ease-in-out;
}
.range-picker .range-enter-from,
.range-picker .range-leave-to {
    max-height: 0;
    padding: 0 5px;
    opacity: 0;
}

.range-picker .invalid-range .range-input,
.range-picker .invalid-percent {
    background: #d446;
}

.range-picker .range input,
.range-picker .range span {
    width: 100px;
}

.range-picker .range .infinity {
    font-size: 20pt;
}
.range-picker .add-range-button {
    margin: 10px 0 0 auto;
}
</style>
