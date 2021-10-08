<script lang="ts">
    import { onMount } from "svelte";
    import { Canvas } from "$lib/canvas/Canvas";
    import { EventBus, EventReceiver } from "$lib/events";
    import { Model } from "$lib/model";
    import { wait, makeRandomRectangle } from "$lib/util";

    let bus: EventBus;
    let receiver: EventReceiver;
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

        canvas.setTruth(model.rectangles);

        canvas.on("drop", (event: IEvent) => {
            const { id, position } = event.detail;
            model.move(id, position);
        });

        canvas.on("delete", (event: IEvent) => {
            model.delete(event.detail!.id);
        });

        canvas.on("select", (event: IEvent) => {
            console.log("selected item", event.detail!.id);
        });

        receiver = new EventReceiver();
        bus.registerListener(receiver);

        receiver.on("item-added",   () => canvas.update());
        receiver.on("item-deleted", () => canvas.update());
        receiver.on("item-moved",   () => canvas.update());
        receiver.on("item-resized", () => canvas.update());
        receiver.on("item-edited",  () => canvas.update());

        wait(1000).then(() => model.add(makeRandomRectangle()));
        wait(2000).then(() => model.add(makeRandomRectangle()));
        wait(3000).then(() => model.add(makeRandomRectangle()));
        wait(4000).then(() => model.add(makeRandomRectangle()));
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
