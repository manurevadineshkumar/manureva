<script>
export default {
    props: {
        isOpen: {
            type: Boolean
        }
    },
};
</script>

<template>
    <button class="menu-toggle-button" :class="{open: isOpen}">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <line stroke="#000" stroke-linecap="round" stroke-width="2" x1="2" y1="20" x2="38" y2="20"/>
            <line stroke="#000" stroke-linecap="round" stroke-width="2" x1="2" y1="20" x2="38" y2="20"/>
            <line stroke="#000" stroke-linecap="round" stroke-width="2" x1="2" y1="20" x2="38" y2="20"/>
        </svg>
    </button>
</template>

<style>
button.menu-toggle-button {
    display: none;
    height: 40px;
    width: 40px;
    padding: 0;
    border: none;
    border-radius: 0;
    opacity: .8;
}
button.menu-toggle-button:hover {
    background-color: transparent;
}
button.menu-toggle-button line {
    transform-box: fill-box;
    transform-origin: center;
    transition: all .4s ease-in-out;
}
button.menu-toggle-button line:nth-child(1) { transform: translateY(-10px); }
button.menu-toggle-button line:nth-child(3) { transform: translateY(10px); }

button.menu-toggle-button.open line:nth-child(1) { transform: rotate(45deg); }
button.menu-toggle-button.open line:nth-child(2) { transform: rotate(135deg); }
button.menu-toggle-button.open line:nth-child(3) { transform: rotate(-135deg); }

@media only screen and (max-width: 800px) {
    button.menu-toggle-button {
        display: block;
    }
}
</style>
