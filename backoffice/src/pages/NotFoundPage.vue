<template>
    <main class="not-found-page">
        <h1>404</h1>
        <p>
            Page not found.
            <router-link to="/">Return home</router-link>?
        </p>
    </main>
</template>

<style>
main.not-found-page {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 40px;
    text-align: center;
}

main.not-found-page h1 {
    font-size: 160pt;
    color: var(--grey);
    margin: 0;
    user-select: none;
}

main.not-found-page p {
    font-size: 14pt;
    color: var(--light-grey-2);
}
</style>
