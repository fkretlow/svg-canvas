<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "$lib/canvas/Canvas";
    import { EventBus } from "$lib/events";
    import { Model } from "$lib/model";

    let bus: EventBus;
    let model: Model;
    let canvas: Canvas;


    let main: HTMLElement;
    onMount(() => {
        bus = new EventBus();

        model = new Model();
        bus.registerSource(model);

        canvas = new Canvas(main, {
            styles: {
                width: "100%",
                height: "100%",
                "background-color": "#edc",
                "border": "1px solid rgba(0,0,0,.2)",
            }
        });
        bus.registerListener(canvas);

        canvas.setTruth(model.rectangles);

        canvas.on("add", (event: IEvent) => {
            model.add({ type: event.detail.type, ...event.detail.position });
        });

        canvas.on("drop", (event: IEvent) => {
            event.detail.items.forEach(({ id, position }) => {
                model.move(id, position);
            })
        });

        canvas.on("delete", (event: IEvent) => {
            model.delete(event.detail!.id);
        });

        canvas.on("resize", (event: IEvent) => {
            model.resize(event.detail.id, event.detail.position, event.detail.size);
        });
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
