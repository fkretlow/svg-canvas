<script lang="ts">
    import { onMount } from "svelte";
    import { SVGCanvas } from "$lib/SVGCanvas";
    import { Model } from "$lib/model";
    import { wait } from "$lib/util";

    const model = new Model();

    model.add({ x: 20, y: 50, width: 100, height: 30 });
    let canvas: SVGCanvas;

    let main: HTMLElement;
    onMount(() => {
        canvas = new SVGCanvas(main, {
            styles: {
                "width": "1000px",
                "height": "800px",
                "background-color": "#edc",
                "border": "1px solid black",
            }
        });
        canvas.setData(model.rectangles).update();

        wait(1000).then(() => {
            model.add({ x: 100, y: 533, width: 30, height: 20 });
        }).then(() => {
            canvas.update();
        })
    });
</script>


<main bind:this={main}>
</main>


<style>
    main {
        width: 100vw;
        height: 100vh;
        padding: 30px;
    }
</style>
