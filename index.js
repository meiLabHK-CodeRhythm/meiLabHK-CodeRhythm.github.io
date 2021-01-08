var detected_result = 0;
var new_detection = false;
var last_detection = 0;

$(function () {
    var resultCollector = Quagga.ResultCollector.create({
        capture: true,
        capacity: 20,
        blacklist: [{
            code: "WIWV8ETQZ1", format: "code_93"
        }, {
            code: "EH3C-%GU23RK3", format: "code_93"
        }, {
            code: "O308SIHQOXN5SA/PJ", format: "code_93"
        }, {
            code: "DG7Q$TV8JQ/EN", format: "code_93"
        }, {
            code: "VOFD1DB5A.1F6QU", format: "code_93"
        }, {
            code: "4SO64P4X8 U4YUU1T-", format: "code_93"
        }],
        filter: function (codeResult) {
            // only store results which match this constraint
            // e.g.: codeResult
            return true;
        }
    });
    var App = {
        init: function () {
            var self = this;

            Quagga.init(this.state, function (err) {
                if (err) {
                    return self.handleError(err);
                }
                //Quagga.registerResultCollector(resultCollector);
                App.attachListeners();
                App.checkCapabilities();
                Quagga.start();
            });
        },
        handleError: function (err) {
            console.log(err);
        },
        checkCapabilities: function () {
            var track = Quagga.CameraAccess.getActiveTrack();
            var capabilities = {};
            if (typeof track.getCapabilities === 'function') {
                capabilities = track.getCapabilities();
            }
            this.applySettingsVisibility('zoom', capabilities.zoom);
            this.applySettingsVisibility('torch', capabilities.torch);
        },
        updateOptionsForMediaRange: function (node, range) {
            console.log('updateOptionsForMediaRange', node, range);
            var NUM_STEPS = 6;
            var stepSize = (range.max - range.min) / NUM_STEPS;
            var option;
            var value;
            while (node.firstChild) {
                node.removeChild(node.firstChild);
            }
            for (var i = 0; i <= NUM_STEPS; i++) {
                value = range.min + (stepSize * i);
                option = document.createElement('option');
                option.value = value;
                option.innerHTML = value;
                node.appendChild(option);
            }
        },
        applySettingsVisibility: function (setting, capability) {
            // depending on type of capability
            if (typeof capability === 'boolean') {
                var node = document.querySelector('input[name="settings_' + setting + '"]');
                if (node) {
                    node.parentNode.style.display = capability ? 'block' : 'none';
                }
                return;
            }
            if (window.MediaSettingsRange && capability instanceof window.MediaSettingsRange) {
                var node = document.querySelector('select[name="settings_' + setting + '"]');
                if (node) {
                    this.updateOptionsForMediaRange(node, capability);
                    node.parentNode.style.display = 'block';
                }
                return;
            }
        },
        initCameraSelection: function () {
            var streamLabel = Quagga.CameraAccess.getActiveStreamLabel();

            return Quagga.CameraAccess.enumerateVideoDevices()
                .then(function (devices) {
                    function pruneText(text) {
                        return text.length > 30 ? text.substr(0, 30) : text;
                    }
                    var $deviceSelection = document.getElementById("deviceSelection");
                    while ($deviceSelection.firstChild) {
                        $deviceSelection.removeChild($deviceSelection.firstChild);
                    }
                    devices.forEach(function (device) {
                        var $option = document.createElement("option");
                        $option.value = device.deviceId || device.id;
                        $option.appendChild(document.createTextNode(pruneText(device.label || device.deviceId || device.id)));
                        $option.selected = streamLabel === device.label;
                        $deviceSelection.appendChild($option);
                    });
                });
        },
        attachListeners: function () {
            var self = this;

            self.initCameraSelection();
            $(".controls").on("click", "button.stop", function (e) {
                e.preventDefault();
                Quagga.stop();
                self._printCollectedResults();
            });

            // $(".controls").on("click", "button.start", function (e) {
            //     App.attachListeners();
            //     App.checkCapabilities();
            //     Quagga.start();
            // });

            $(".controls .reader-config-group").on("change", "input, select", function (e) {
                e.preventDefault();
                var $target = $(e.target),
                    value = $target.attr("type") === "checkbox" ? $target.prop("checked") : $target.val(),
                    name = $target.attr("name"),
                    state = self._convertNameToState(name);

                console.log("Value of " + state + " changed to " + value);
                self.setState(state, value);
            });
        },
        _printCollectedResults: function () {
            var results = resultCollector.getResults(),
                $ul = $("#result_strip ul.collector");

            results.forEach(function (result) {
                var $li = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');

                // $li.find("img").attr("src", result.frame);
                $li.find("h4.code").html(result.codeResult.code + " (" + result.codeResult.format + ")");
                $ul.prepend($li);
            });
        },
        _accessByPath: function (obj, path, val) {
            var parts = path.split('.'),
                depth = parts.length,
                setter = (typeof val !== "undefined") ? true : false;

            return parts.reduce(function (o, key, i) {
                if (setter && (i + 1) === depth) {
                    if (typeof o[key] === "object" && typeof val === "object") {
                        Object.assign(o[key], val);
                    } else {
                        o[key] = val;
                    }
                }
                return key in o ? o[key] : {};
            }, obj);
        },
        _convertNameToState: function (name) {
            return name.replace("_", ".").split("-").reduce(function (result, value) {
                return result + value.charAt(0).toUpperCase() + value.substring(1);
            });
        },
        detachListeners: function () {
            $(".controls").off("click", "button.stop");
            $(".controls .reader-config-group").off("change", "input, select");
        },
        // applySetting: function (setting, value) {
        //     var track = Quagga.CameraAccess.getActiveTrack();
        //     if (track && typeof track.getCapabilities === 'function') {
        //         switch (setting) {
        //             case 'zoom':
        //                 return track.applyConstraints({ advanced: [{ zoom: parseFloat(value) }] });
        //             case 'torch':
        //                 return track.applyConstraints({ advanced: [{ torch: !!value }] });
        //         }
        //     }
        // },
        setState: function (path, value) {
            var self = this;

            if (typeof self._accessByPath(self.inputMapper, path) === "function") {
                value = self._accessByPath(self.inputMapper, path)(value);
            }

            if (path.startsWith('settings.')) {
                var setting = path.substring(9);
                return self.applySetting(setting, value);
            }
            self._accessByPath(self.state, path, value);

            console.log(JSON.stringify(self.state));
            App.detachListeners();
            Quagga.stop();
            App.init();
        },
        inputMapper: {
            inputStream: {
                constraints: function (value) {
                    if (/^(\d+)x(\d+)$/.test(value)) {
                        var values = value.split('x');
                        return {
                            width: { min: parseInt(values[0]) },
                            height: { min: parseInt(values[1]) }
                        };
                    }
                    return {
                        deviceId: value
                    };
                }
            },
            numOfWorkers: function (value) {
                return parseInt(value);
            },
            decoder: {
                readers: function (value) {
                    if (value === 'ean_extended') {
                        return [{
                            format: "ean_reader",
                            config: {
                                supplements: [
                                    'ean_5_reader', 'ean_2_reader'
                                ]
                            }
                        }];
                    }
                    return [{
                        format: value + "_reader",
                        config: {}
                    }];
                }
            }
        },
        state: {
            inputStream: {
                type: "LiveStream",
                constraints: {
                    width: { min: 1280 },
                    height: { min: 720 },
                    facingMode: "environment",
                    aspectRatio: { min: 1, max: 2 }
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: 1,
            frequency: 10,
            decoder: {
                readers: [{
                    format: "code_128_reader",
                    config: {}
                }]
            },
            locate: true
        },
        lastResult: null
    };

    App.init();

    // drawing boxes 
    Quagga.onProcessed(function (result) {
        var drawingCtx = Quagga.canvas.ctx.overlay,
            drawingCanvas = Quagga.canvas.dom.overlay;

        if (result) {
            if (result.boxes) {
                drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
                result.boxes.filter(function (box) {
                    return box !== result.box;
                }).forEach(function (box) {
                    Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
                });
            }

            if (result.box) {
                Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
            }

            if (result.codeResult && result.codeResult.code) {
                Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
            }
        }
    });

    Quagga.onDetected(function (result) {
        var code = result.codeResult.code;

        if (App.lastResult !== code) {
            App.lastResult = code;
            var $node = null, canvas = Quagga.canvas.dom.image;

            $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
            // $node.find("img").attr("src", canvas.toDataURL());
            $node.find("h4.code").html(code);
            // console.log(code);
            detected_result = code;
            $("#result_strip ul.thumbnails").prepend($node);
        }
    });

});


/*
Following scripts were created by Alston Lantian X. on 10 Nov 2020
Some functions were contirbuted by Hugo and Kexin
*/

let addBlockBtn, endBtn;
let mainInput, b1Input, b2Input, b3Input, b4Input;
let mainSeq, b1Seq, b2Seq, b3Seq, b4Seq;

var notes = [60, 62, 64, 65, 67, 69, 71, 72];
var osc;

var rawSplit;
var rawSplitSt = [];
var note = [], duration = [], volume = [], melodySeq = [];

let main_focused = false;
let b1_focused = false;
let b2_focused = false;
let b3_focused = false;
let b4_focused = false;

let trigger = 0;
let index = 0;
let autoplay = false;

var addnewblock = false;

var context = new AudioContext();
var o = null;
var g = null;


var convertedSeq = "";
let cat_branch = false;
let heart_branch = false;
let thunder_branch = false;
let moon_branch = false;
let sun_branch = false;
let star_branch = false;
let ct_str = "", ht_str = "", th_str = "", mn_str = "", sn_str = "", sr_str = "";


function setup() {
    // var w = window.innerWidth;
    // console.log("innerWidth " + w);
    createCanvas(windowWidth, windowHeight - 250);
    background(240);

    // A triangle oscillator
    osc = new p5.TriOsc();
    // Start silent
    osc.start();
    osc.amp(0);

    //input for main melody
    // mainInput = createInput();
    // mainInput.style('font-size', '20px', 'color', '#ffffff');
    // mainInput.size(windowWidth * 0.8, 30);
    // mainInput.position(windowWidth * 0.1, 305);

    //inputs for branches
    // b1Input = createInput();
    // b1Input.style('font-size', '20px', 'color', '#ffffff');
    // b1Input.size(windowWidth * 0.8, 30);
    // b1Input.position(windowWidth * 0.1, 360);

    // b2Input = createInput();
    // b2Input.style('font-size', '20px', 'color', '#ffffff');
    // b2Input.size(windowWidth * 0.8, 30);
    // b2Input.position(windowWidth * 0.1, 415);

    // b3Input = createInput();
    // b3Input.style('font-size', '20px', 'color', '#ffffff');
    // b3Input.size(windowWidth * 0.8, 30);
    // b3Input.position(windowWidth * 0.1, 470);

    // b4Input = createInput();
    // b4Input.style('font-size', '20px', 'color', '#ffffff');
    // b4Input.size(windowWidth * 0.8, 30);
    // b4Input.position(windowWidth * 0.1, 525);

    addBlockBtn = createButton('Add Block');
    addBlockBtn.position(windowWidth * 0.1, 390);
    addBlockBtn.size(windowWidth * 0.38, 30);
    addBlockBtn.style('font-size', '20px');
    addBlockBtn.mousePressed(addnewblocks);

    endBtn = createButton('Play');
    endBtn.position(windowWidth * 0.52, 390);
    endBtn.size(windowWidth * 0.38, 30);
    endBtn.style('font-size', '20px');
    endBtn.mousePressed(playSeq);
    updateInput();
}

function draw() {

    // newDetection();
    // if (detected_result != 0 && new_detection) {
    //     // console.log(detected_result);
    //     background(240);
    //     textSize(20);
    //     textAlign(CENTER);
    //     text("Last Detected: " + detected_result, 0, 10, windowWidth);
    //     // mainInput.value(detected_result);
    //     updateInput();
    // }

    // if (addnewblock) {
    //     updateInput();
    //     addnewblock = false;
    // }

    //alston. here is to play the whole seq
    if (autoplay && millis() > trigger) {
        playNote(note[index], duration[index]);
        trigger = millis() + duration[index];
        // console.log(trigger);
        index++;
    } else if (index >= note.length) {
        autoplay = false;
        index = 0;
    }


}

function newDetection() {
    if (detected_result == last_detection) {
        new_detection = false;
    } else {
        new_detection = true;
        last_detection = detected_result;
    }
}

function updateInput() {
    // mainSeq = mainInput.value();
    // mainSeq = mainSeq + detected_result;
    mainSeq = "11 ( 21 31 ) 2 SSCT 41 51 SECT 11";
    // mainSeq = "11 21";
    detectBlock(mainSeq);
    console.log(convertedSeq);
    console.log(ct_str);
    // b1Seq = b1Input.value();
    // b2Seq = b2Input.value();
    // b3Seq = b3Input.value();
    // b4Seq = b4Input.value();
    // note = [];
    // duration = [];
    // volume = [];
    // melodySeq = [];

    // print("THE INPUT SEQUENCE : ");
    // print(mainSeq);
    // if (b1Seq != "") {
    //     print("Branch 1 : " + b1Seq);
    // }
    // if (b2Seq != "") {
    //     print("Branch 2 : " + b2Seq);
    // }
    // if (b3Seq != "") {
    //     print("Branch 3 : " + b3Seq);
    // }
    // if (b4Seq != "") {
    //     print("Branch 4 : " + b4Seq);
    // }
    Convert();
    // addnewblocks = false;
}

function Convert() {
    if (!convertedSeq.includes("(")) {
        rawSplitSt = split(convertedSeq, " ");
        for (var i = 0; i < rawSplitSt.length; i++) {
            if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                detectSwitch(rawSplitSt[i]);
            } else {
                rawSplit = int(rawSplitSt[i]);
                getSeq(rawSplit);
            }
        }
    }
    else {
        raw = ConvertMethod2(convertedSeq);
        rawSplitSt = split(raw, " ");
        for (var i = 0; i < rawSplitSt.length; i++) {
            if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                detectSwitch(rawSplitSt[i]);
            } else {
                rawSplit = int(rawSplitSt[i]);
                getSeq(rawSplit);
            }
        }
    }
    print("PLAYED : " + melodySeq.length + " Notes.");
    // print("OUTPUTS: ");
    // for (var i = 0; i < melodySeq.length; i++) {
    //   print(melodySeq[i]);
    // }

}

//Kexin recursively process the string
function ConvertMethod2(str) {
    var bIndex = [];
    var repeatIdx = [];
    var nestloopIdx = [];
    var outputStr;
    var appendStr = [];
    var hasNest = false;
    //find position of ()
    // print(str.length);
    for (var i = 0; i < str.length; i++) {
        var theChar = str.charAt(i);
        // print("visited");
        // print(theChar);
        if (theChar == '(') {
            bIndex.push(i);
            var contains = false;
            for (var j = i + 1; j < str.length; j++) {
                if (str.charAt(j) == '(') {
                    contains = true;
                }
                else if (str.charAt(j) == ')') {
                    if (contains) { contains = false; if (!nestloopIdx.includes(i)) nestloopIdx.push(i); hasNest = true; }
                    else {
                        bIndex.push(j);
                        repeatIdx.push(str.charAt(j + 2));
                        i = j + 1;
                        break;
                    }
                }
            }
        }
    }

    if (bIndex[0] > 0) appendStr.push(str.substring(0, bIndex[0]));
    for (var i = 0; i < bIndex.length; i = i + 2) {
        //if(hasNest){
        if (nestloopIdx.includes(bIndex[i])) {
            var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            appendStr.push(ConvertMethod2(loopStr));
        }
        else {
            // var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            var loopStr = ProcessLoop(str.substring(bIndex[i] + 1, bIndex[i + 1]), repeatIdx[i / 2]);
            // print(loopStr);
            appendStr.push(loopStr);
        }
        if (i + 2 < bIndex.length) appendStr.push(str.substring(bIndex[i + 1] + 3, bIndex[i + 2]));//if have other () behind
        else if (bIndex[i + 1] + 3 < str.length) appendStr.push(str.substring(bIndex[i + 1] + 3, str.length));
    }
    // for (var i = 0; i < appendStr.length; i++) {
    //   print("brackets: " + appendStr[i]);
    // }

    outputStr = appendStr.join("");
    // print(outputStr);
    return outputStr;
}

//Kexin repeat the loop string
function ProcessLoop(loopStr, repeatTime) {
    var outputStr;
    var appendStr = [];
    for (var i = 0; i < repeatTime; i++) {
        appendStr.push(loopStr);
    }
    outputStr = appendStr.join();
    return outputStr;
}

//alston. the following functions are for switch functions. 
function detectSwitch(branchID) {
    //alston. not using "else if" in case switches don't come in pair 20201105
    switch (branchID) {
        case ("CT"):
            if (b1Seq != "") {
                InsertSwitch(ct_str);
            } else {
                print("BRANCH 1 HAS NO INPUTS");
            }
            break;
        case ("HT"):
            if (b2Seq != "") {
                InsertSwitch(ht_str);
            } else {
                print("BRANCH 2 HAS NO INPUTS");
            }
            break;
        case ("TH"):
            if (b3Seq != "") {
                InsertSwitch(th_str);
            } else {
                print("BRANCH 3 HAS NO INPUTS");
            }
            break;
        case ("MN"):
            if (b4Seq != "") {
                InsertSwitch(mn_str);
            } else {
                print("BRANCH 4 HAS NO INPUTS");
            }
            break;
        case ("SN"):
            if (b4Seq != "") {
                InsertSwitch(sn_str);
            } else {
                print("BRANCH 4 HAS NO INPUTS");
            }
            break;
        case ("SR"):
            if (b4Seq != "") {
                InsertSwitch(b4Seq);
            } else {
                print("BRANCH 4 HAS NO INPUTS");
            }
            break;
    }
}

function InsertSwitch(str) {
    var strSplit = [];
    var intSplit;

    if (!str.includes("(")) {
        strSplit = split(str, " ");
        for (var i = 0; i < strSplit.length; i++) {
            intSplit = int(strSplit[i]);
            getSeq(intSplit);
        }
    }
    else {
        str = ConvertMethod2(str);
        strSplit = split(str, " ");
        // printArray(strSplit);
        for (var i = 0; i < strSplit.length; i++) {
            intSplit = int(strSplit[i]);
            getSeq(intSplit);
        }
    }

}

//alston. the following functions are for playing note sequence.
function getSeq(digits) {
    volume.push(100);
    let noteDua, noteCode;
    noteDua = int(digits % 10);
    noteCode = int(digits / 10);
    switch (noteDua) {
        case (1): duration.push(300); break;
        case (2): duration.push(700); break;
        case (3): duration.push(1100); break;
        // case (4): duration.push(1200); break;
    }
    switch (noteCode) {
        case (1): note.push(261.63); melodySeq.push(1); break;
        case (2): note.push(293.67); melodySeq.push(2); break;
        case (3): note.push(329.63); melodySeq.push(3); break;
        case (4): note.push(349.23); melodySeq.push(4); break;
        case (5): note.push(392.00); melodySeq.push(5); break;
    }
}

function playSeq() {
    // console.log(note.length);
    for (var i = 0; i < note.length; i++) {
        console.log(note[i] + " " + duration[i]);
    }
    autoplay = true;
    //alston. playing seq is conducted inside draw()
}

// Alternative function to play a note with web audio api
// function testSound() {
//     playNote2(1047, 'sine');
// }

function playNote(frequency, dur) {
    o = context.createOscillator();
    g = context.createGain();
    o.type = 'sine';
    o.connect(g);
    o.frequency.value = frequency;
    g.connect(context.destination);
    g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + dur / 1000);
    o.start(0);

}


function detectBlock(scanned_str) {
    let split_str = [];
    split_str = scanned_str.split(" ");
    const block_amount = split_str.length;

    for (i = 0; i < block_amount; i++) {
        // var regExp = /[a-zA-Z]/g;
        // if (!regExp.test("haha")) {
        //     var note_midi = scanned_str.charAt(0);
        //     var note_dur = scanned_str.charAt(1);
        //     convertNoteMIDI(note_midi);
        //     convertNoteDur(note_dur);
        // }

        if (split_str[i].includes("SS") || split_str[i].includes("SE")) {
            if (split_str[i].includes("SS")) {
                const input_index = mainSeq.indexOf("SS");
                let branch_index = split_str[i].slice(2, 4);
                // console.log(branch_index);
                switch (branch_index) {
                    case ("CT"):
                        cat_branch = true;
                        ct_str = extractSwitchSeq("CT", input_index);
                        i = split_str.indexOf("SECT");
                        break;
                    case ("HT"):
                        heart_branch = true;
                        extractSwitchSeq(mainSeq, "HT");
                        break;
                    case ("TH"):
                        thunder_branch = true;
                        extractSwitchSeq(mainSeq, "TH");
                        break;
                    case ("MN"):
                        moon_branch = true;
                        extractSwitchSeq(mainSeq, "MN");
                        break;
                    case ("SN"):
                        sun_branch = true;
                        extractSwitchSeq(mainSeq, "SN");
                        break;
                    case ("SR"):
                        star_branch = true;
                        extractSwitchSeq(mainSeq, "SR");
                        break;
                }
            } else if (split_str[i].includes('SE')) {
                resetBranch();
            }
        } else {
            convertedSeq = convertedSeq + " " + split_str[i];
        }
    }
}

function convertNoteMIDI(inputs) {
    switch (inputs) {
        case (1): note.push(261.63); melodySeq.push(1); break;
        case (2): note.push(293.67); melodySeq.push(2); break;
        case (3): note.push(329.63); melodySeq.push(3); break;
        case (4): note.push(349.23); melodySeq.push(4); break;
        case (5): note.push(392.00); melodySeq.push(5); break;
        // case (6): note.push(440.00); melodySeq.push(6); break;
        // case (7): note.push(493.88); melodySeq.push(7); break;
        // case (8): note.push(523.251); melodySeq.push(8); break;
    }
}

function convertNoteDur(inputs) {
    switch (inputs) {
        case (1): duration.push(300); break;
        case (2): duration.push(700); break;
        case (3): duration.push(1100); break;
        // case (4): duration.push(1200); break;
    }
}

function resetBranch() {
    cat_branch = false;
    heart_branch = false;
    thunder_branch = false;
    moon_branch = false;
    sun_branch = false;
    star_branch = false;
}

function addnewblocks() {
    addnewblock = true;
}


function errors(errorCode) {
    switch (errorCode) {
        case (0):
            console.log("Switch is not complete! Please scan barcode on the blocks again.");
            break;
        case (1):
            console.log("Loop is not complete! Please scan barcode on the blocks again.");
            break;
        case (2):
            console.log("Empty Switch/Loop Blocks!");
            break;
        // case (3):
        //     console.log("Switch is not complete!");
        //     break;
        // case (4):
        //     console.log("Switch is not complete!");
        //     break;
    }
}


function extractSwitchSeq(searchID, inputIndex) {
    var startID = "SS" + searchID;
    var endID = "SE" + searchID;
    var switchStartIndex = mainSeq.indexOf(startID) + 5;
    var switchEndIndex = mainSeq.indexOf(endID) - 2;
    var switchStr = mainSeq.slice(switchStartIndex, switchEndIndex + 1);
    // var switchStr = mainSeq.slice(0, inputIndex + 1);
    convertedSeq = convertedSeq + " " + String(searchID);
    // mainSeq = mainSeq.replace("")
    // convertedSeq = 

    return switchStr;
}
