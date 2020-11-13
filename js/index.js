let ticker = PIXI.Ticker.system;
let globalMidi = null;

/*const midi = Midi.fromUrl("abwhsolo.mid").then(midi => {
    globalMidi = midi;
})*/


const app = new PIXI.Application({
    autoResize: true,
    resolution: devicePixelRatio
});

document.body.appendChild(app.view);

if (!(
        window.File &&
        window.FileReader &&
        window.FileList &&
        window.Blob
    )) {
    document.querySelector("#FileDrop #Text").textContent =
        "Reading files not supported by this browser";
} else {
    const fileDrop = document.querySelector("#FileDrop");

    fileDrop.addEventListener("dragenter", () =>
        fileDrop.classList.add("Hover")
    );

    fileDrop.addEventListener("dragleave", () =>
        fileDrop.classList.remove("Hover")
    );

    fileDrop.addEventListener("drop", () =>
        fileDrop.classList.remove("Hover")
    );

    document
        .querySelector("#FileDrop input")
        .addEventListener("change", (e) => {
            //get the files
            const files = e.target.files;
            if (files.length > 0) {
                const file = files[0];
                document.querySelector(
                    "#FileDrop #Text"
                ).textContent = file.name;
                parseFile(file);
            }
        });
}

function parseFile(file) {
    //read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        const midi = new Midi(e.target.result);
        play(midi);
        globalMidi = midi;
        document.querySelector("canvas").setAttribute("style", "display: block;");
        document.querySelector("tone-content").setAttribute("style", "display:none;");
    };
    reader.readAsArrayBuffer(file);
}

function rgb2hex(rgb) {
    return ((rgb[0] * 255 << 16) + (rgb[1] * 255 << 8) + rgb[2] * 255);
};

function play(midi) {
    //app.screen.width = window.document.body.clientWidth
    //app.screen.height = window.document.body.clientHeight
    if (midi) {
        midi.tracks.forEach(track => {
            const synth = new Tone.PolySynth().toDestination();
            track.notes.forEach(note => {
                if (track.instrument.percussion) return;
                synth.triggerAttackRelease(note.name, note.duration, note.time + Tone.now() + midi.header.tempos[0].bpm / 60, note.velocity)
                Tone.getDraw().schedule(function() {
                    let newNote = new PIXI.Graphics();
                    newNote.beginFill(0xFF0000, note.velocity + 0.2)
                    let height = (note.duration * globalMidi.header.tempos[0].bpm);
                    let beat = midi.header.tempos[0].bpm / 60;
                    newNote.drawRect((note.midi - 21) / 88 * app.screen.width, 0 - height, (app.screen.width / 88), height);
                    newNote.endFill();
                    newNote.time = Date.now();
                    app.stage.addChild(newNote);
                    // newNote.filters = [new PIXI.filters.GodrayFilter()]
                }, note.time + Tone.now())

            })

        });
    }


    PIXI.Ticker.shared.add(function(time) {
        app.stage.children.forEach(child => {
            if (child.y >= app.screen.height + child.height) {
                app.stage.removeChild(child);
            }
            child.y += app.screen.height / globalMidi.header.tempos[0].bpm;
        })
    })
}

app.stage.filters = [
    // new PIXI.filters.GlowFilter({ distance: 5, outerStrength: 2 })
];