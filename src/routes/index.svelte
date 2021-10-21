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
            }
        });
        bus.registerListener(canvas);

        canvas.setTruth(model);

        canvas.on("add", (event: IEvent) => {
            const data = {
                type: event.detail.type,
                laneId: event.detail.laneId,
                x: event.detail.laneCoordinates.x,
                y: event.detail.laneCoordinates.y,
            };
            model.addItem(data);
        });

        canvas.on("drop", (event: IEvent) => {
            event.detail.items.forEach(({ id, laneCoordinates, laneId }) => {
                model.move(id, laneId, laneCoordinates);
            })
        });

        canvas.on("delete", (event: IEvent) => {
            model.delete(event.detail!.id);
        });

        canvas.on("resize", (event: IEvent) => {
            model.resize(event.detail!.id, event.detail!.size);
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
