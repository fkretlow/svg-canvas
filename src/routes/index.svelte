<script lang="ts">
    import { onMount } from "svelte";
    import { SVGCanvas } from "$lib/SVGCanvas";
    import { EventBus, EventReceiver } from "$lib/events";
    import { Model } from "$lib/model";
    import { wait, randint, makeRandomRectangle } from "$lib/util";

    let bus: EventBus;
    let receiver: EventReceiver;
    let model: Model;
    let canvas: SVGCanvas;


    let main: HTMLElement;
    onMount(() => {
        bus = new EventBus();

        model = new Model();
        bus.registerSource(model);

        canvas = new SVGCanvas(main, {
            styles: {
                width: "100%",
                height: "100%",
            }
        });

        canvas.setData(model.rectangles);

        canvas.on("drop", (event: IEvent) => {
            const { id, position } = event.detail;
            model.move(id, position);
        });

        canvas.on("click", (event: IEvent) => {
            const { id, altKey } = event.detail;
            if (altKey) {
                model.delete(id);
            } else {
                model.changeColor(id);
            }
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
