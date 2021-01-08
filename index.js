var detected_result = "";
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

        //alston. ALLOW SAME RESULTS
        // if (App.lastResult !== code) {
        App.lastResult = code;
        var $node = null, canvas = Quagga.canvas.dom.image;

        $node = $('<li><div class="thumbnail"><div class="imgWrapper"><img /></div><div class="caption"><h4 class="code"></h4></div></div></li>');
        // $node.find("img").attr("src", canvas.toDataURL());
        $node.find("h4.code").html(code);
        // console.log(code);
        detected_result = code;
        $("#result_strip ul.thumbnails").prepend($node);
        // }
    });

});


/*
Following scripts were created by Alston Lantian X. on 10 Nov 2020
Some functions were contirbuted by Hugo and Kexin
*/

let addBlockBtn, endBtn, clearBtn;
let mainSeq = "";

var notes = [60, 62, 64, 65, 67, 69, 71, 72];
var osc;

var rawSplit;
var rawSplitSt = [];
var note = [], duration = [], volume = [], melodySeq = [];
let testSeq = [];

let main_focused = false;
let b1_focused = false;
let b2_focused = false;
let b3_focused = false;
let b4_focused = false;

let trigger = 0;
let index = 0;
let autoplay = false;
let detectInterval = 0;

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
let error_exist = false;
let error_msg = "";
let clear = true;
let BLOCKS_DETECTED = 0;

function setup() {
    // var w = window.innerWidth;
    // console.log("innerWidth " + w);
    createCanvas(windowWidth, windowHeight - 450);
    background(240);

    // A triangle oscillator
    osc = new p5.TriOsc();
    // Start silent
    osc.start();
    osc.amp(0);

    addBlockBtn = createButton('ADD BLOCK 添加');
    addBlockBtn.position(windowWidth * 0.1, 390);
    addBlockBtn.size(windowWidth * 0.38, 30);
    addBlockBtn.style('font-size', '18px');
    // addBlockBtn.style('Font Style Bold');
    addBlockBtn.mousePressed(Addnewblocks);

    endBtn = createButton('PLAY 播放');
    endBtn.position(windowWidth * 0.52, 390);
    endBtn.size(windowWidth * 0.38, 30);
    endBtn.style('font-size', '18px');
    endBtn.mousePressed(PrintSeq);

    clearBtn = createButton('CLEAR 清空');
    clearBtn.position(windowWidth * 0.52, 340);
    clearBtn.size(windowWidth * 0.38, 30);
    clearBtn.style('font-size', '18px');
    clearBtn.mousePressed(ClearInput);
}

function draw() {

    if (clear) {
        background(240);
        textSize(15);
        textAlign(CENTER);
        textStyle(BOLD);
        text("Please Scan Blocks To Start\n請掃描條形碼", 0, 10, windowWidth);
    }

    // NewDetection();
    if (detected_result != "" && !addnewblock) {
        let isnum = /^\d+$/.test(detected_result);
        if (isnum) {
            let testNote = Number(String(detected_result).charAt(0));
            let testDur = Number(String(detected_result).charAt(1));
            // TestSound(testNote, testDur);
            if (millis() > detectInterval) {
                detectInterval = millis() + 2000;
                TestSound(testNote, testDur);
            }
            detected_result = "";
        } else {

        }
    } else if (detected_result != "" && addnewblock) {
        if (millis() > detectInterval) {
            detectInterval = millis() + 2000;
            background(240);
            textSize(15);
            textAlign(RIGHT);
            textStyle(NORMAL);
            text("Last Detected:\n掃描結果： " + detected_result, -10, 10, windowWidth);
            console.log("Added: " + detected_result);
            textAlign(LEFT);
            textSize(15);
            text("Blocks Detected:\n已掃描數量：" + BLOCKS_DETECTED, 10, 10, windowWidth);
            ReadNewBlock();
        }
    }

    if (!error_exist) {
        if (note != 0) {
            //alston. here is to play the whole seq
            if (autoplay && millis() > trigger) {
                PlayNote(note[index], duration[index]);
                trigger = millis() + duration[index];
                // console.log(trigger);
                index++;
            } else if (index >= note.length) {
                autoplay = false;
                index = 0;
            }
        }
    } else {
        background(240);
        textSize(13);
        textAlign(CENTER);
        textStyle(BOLD);
        text("Error: " + error_msg, 0, 10, windowWidth);
    }

    textSize(15);
    textAlign(CENTER);
    textStyle(BOLD);
    text("MEI Lab @SCM", 0, 270, windowWidth);
}

function ReadNewBlock() {
    if (addnewblock) {
        mainSeq = mainSeq + " " + detected_result;
        addnewblock = false;
        clear = false;
    }
}

function ClearInput() {
    mainSeq = "";
    convertedSeq = "";
    detected_result = "";
    note = [];
    duration = [];
    melodySeq = [];
    clear = true;
    error_exist = false;
    BLOCKS_DETECTED = 0;
    console.log("Cleared!")
}

function Convert() {
    if (mainSeq) {
        console.log("Scanned Blocks: " + mainSeq);
    }
    if (!convertedSeq) {
        ERRORS(3);
    } else {
        if (!convertedSeq.includes("(")) {
            rawSplitSt = split(convertedSeq, " ");
            for (var i = 0; i < rawSplitSt.length; i++) {
                if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                    DetectSwitch(rawSplitSt[i]);
                } else {
                    rawSplit = int(rawSplitSt[i]);
                    GetSeq(rawSplit);
                }
            }
        }
        else {
            raw = ConvertMethod2(convertedSeq);
            rawSplitSt = split(raw, " ");
            for (var i = 0; i < rawSplitSt.length; i++) {
                if (rawSplitSt[i].includes("CT") || rawSplitSt[i].includes("HT") || rawSplitSt[i].includes("TH") || rawSplitSt[i].includes("MN") || rawSplitSt[i].includes("SN") || rawSplitSt[i].includes("SR")) {
                    DetectSwitch(rawSplitSt[i]);
                } else {
                    rawSplit = int(rawSplitSt[i]);
                    GetSeq(rawSplit);
                }
            }
        }
        if (!error_exist && note != 0) {
            print("PLAYED : " + melodySeq.length + " Notes.");
        }
        // print("OUTPUTS: ");
        // for (var i = 0; i < melodySeq.length; i++) {
        //   print(melodySeq[i]);
        // }
    }
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
            if (!str.includes(")")) {
                ERRORS(1);
            } else {
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
                            repeatIdx.push(str.charAt(j + 1));
                            i = j + 1;
                            break;
                        }
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
function DetectSwitch(branchID) {
    //alston. not using "else if" in case switches don't come in pair 20201105
    switch (branchID) {
        case ("CT"):
            if (b1Seq != "") {
                InsertSwitch(ct_str);
            } else {
                print("NO CAT BRANCH");
            }
            break;
        case ("HT"):
            if (b2Seq != "") {
                InsertSwitch(ht_str);
            } else {
                print("NO HEART BRANCH");
            }
            break;
        case ("TH"):
            if (b3Seq != "") {
                InsertSwitch(th_str);
            } else {
                print("NO THUNDER BRANCH");
            }
            break;
        case ("MN"):
            if (b4Seq != "") {
                InsertSwitch(mn_str);
            } else {
                print("NO MOON BRANCH");
            }
            break;
        case ("SN"):
            if (b4Seq != "") {
                InsertSwitch(sn_str);
            } else {
                print("NO SUN BRANCH");
            }
            break;
        case ("SR"):
            if (b4Seq != "") {
                InsertSwitch(b4Seq);
            } else {
                print("NO STAR BRANCH");
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
            GetSeq(intSplit);
        }
    }
    else {
        str = ConvertMethod2(str);
        strSplit = split(str, " ");
        // printArray(strSplit);
        for (var i = 0; i < strSplit.length; i++) {
            intSplit = int(strSplit[i]);
            GetSeq(intSplit);
        }
    }

}

//alston. the following functions are for playing note sequence.
function GetSeq(digits) {
    volume.push(100);
    let noteDur, noteCode;
    noteDur = int(digits % 10);
    noteCode = int(digits / 10);
    switch (noteDur) {
        case (1): duration.push(300); break;
        case (2): duration.push(600); break;
        case (3): duration.push(900); break;
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

function TestSound(inputNote, inputDur) {
    let freq = 0, dur = 0;
    switch (inputNote) {
        case (1): freq = 261.63; break;
        case (2): freq = 293.67; break;
        case (3): freq = 329.63; break;
        case (4): freq = 349.23; break;
        case (5): freq = 392.00; break;
    }
    switch (inputDur) {
        case (1): dur = 300; break;
        case (2): dur = 600; break;
        case (3): dur = 900; break;
    }
    PlayNote(freq, dur);
}

function PrintSeq() {
    DetectBlock(mainSeq);
    Convert();
    if (!error_exist) {
        for (var i = 0; i < note.length; i++) {
            console.log(note[i] + " " + duration[i]);
        }
        autoplay = true;
    }
    mainSeq = "";
    convertedSeq = "";
    //alston. playing seq is conducted inside draw()
}

function PlayNote(frequency, dur) {
    o = context.createOscillator();
    g = context.createGain();
    o.type = 'sine';
    o.connect(g);
    o.frequency.value = frequency;
    g.connect(context.destination);
    g.gain.exponentialRampToValueAtTime(0.00001, context.currentTime + dur / 1000);
    o.start(0);

}

function DetectBlock(scanned_str) {

    let split_str = [];
    split_str = scanned_str.split(" ");
    const block_amount = split_str.length;

    for (i = 0; i < block_amount; i++) {
        if (split_str[i].includes("SS") || split_str[i].includes("SE")) {
            if (split_str[i].includes("SS")) {
                if (mainSeq.includes("SE")) {
                    const input_index = mainSeq.indexOf("SS");
                    let branch_index = split_str[i].slice(2, 4);
                    switch (branch_index) {
                        case ("CT"):
                            cat_branch = true;
                            ct_str = ExtractSwitchSeq("CT", input_index);
                            i = split_str.indexOf("SECT");
                            break;
                        case ("HT"):
                            heart_branch = true;
                            ht_str = ExtractSwitchSeq("HT", input_index);
                            i = split_str.indexOf("SEHT");
                            break;
                        case ("TH"):
                            thunder_branch = true;
                            th_str = ExtractSwitchSeq("TH", input_index);
                            i = split_str.indexOf("SETH");
                            break;
                        case ("MN"):
                            moon_branch = true;
                            mn_str = ExtractSwitchSeq("MN", input_index);
                            i = split_str.indexOf("SEMN");
                            break;
                        case ("SN"):
                            sun_branch = true;
                            sn_str = ExtractSwitchSeq("SN", input_index);
                            i = split_str.indexOf("SESN");
                            break;
                        case ("SR"):
                            star_branch = true;
                            sr_str = ExtractSwitchSeq("SR", input_index);
                            i = split_str.indexOf("SESR");
                            break;
                    }
                } else {
                    ERRORS(0);
                }
            } else if (split_str[i].includes('SE')) {
                ResetBranch();
            }
        } else {
            convertedSeq = convertedSeq + " " + split_str[i];
        }
    }

}

function ResetBranch() {
    cat_branch = false;
    heart_branch = false;
    thunder_branch = false;
    moon_branch = false;
    sun_branch = false;
    star_branch = false;
}

function Addnewblocks() {
    addnewblock = true;
    BLOCKS_DETECTED++;
}

function ERRORS(errorCode) {
    switch (errorCode) {
        case (0):
            error_msg = "Branch blocks are not in pair!\nPlease scan barcode on the blocks again.\n分支模塊不匹配，請重新掃描";
            error_exist = true;
            break;
        case (1):
            error_msg = "Loop blocks are not in pair!\nPlease scan barcode on the blocks again.\n循環體不完整，請重新掃描";
            error_exist = true;
            break;
        case (2):
            error_msg = "Empty Switch/Loop Blocks!\n請重新掃描";
            error_exist = true;
            break;
        case (3):
            error_msg = "No detected blocks!\n模塊空缺，請重新掃描";
            error_exist = true;
            break;
        // case (4):
        //     console.log("Switch is not complete!");
        //     break;
    }
}


function ExtractSwitchSeq(searchID, inputIndex) {
    var startID = "SS" + searchID;
    var endID = "SE" + searchID;
    var switchStartIndex = mainSeq.indexOf(startID) + 5;
    var switchEndIndex = mainSeq.indexOf(endID) - 2;
    var switchStr = mainSeq.slice(switchStartIndex, switchEndIndex + 1);
    convertedSeq = convertedSeq + " " + String(searchID);

    return switchStr;
}


function DescriSound(inputStr) {
    if (inputStr.includes("(")) {
        var audio = new Audio('audio_file.mp3');
        audio.play();
    } else if (inputStr.includes(")")) {
        var audio = new Audio('audio_file.mp3');
        audio.play();
    } else if (inputStr.includes("SS")) {
        var audio = new Audio('audio_file.mp3');
        audio.play();
    } else if (inputStr.includes("SE")) {
        var audio = new Audio('audio_file.mp3');
        audio.play();
    }
}
