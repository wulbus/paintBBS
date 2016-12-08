'use strict';

document.addEventListener("DOMContentLoaded", function() {
    Neo.init();

    if (!navigator.userAgent.match("Electron")) {
        Neo.start();
    }
});


var Neo = function() {};

Neo.version = "0.8.0";

Neo.painter;
Neo.fullScreen = false;
Neo.uploaded = false;

Neo.config = {
    width: 300,
    height: 300,

    color_bk: "#ccccff",
    color_bk2: "#bbbbff",
    color_bar: "#6f6fae",

    color_tool_icon: "#e8dfae",

    color_icon: "#ccccff",
    color_iconselect: "#ffaaaa",
    color_text: "#666699",
    color_bar: "#6f6fae",

    tool_color_button: "#e8dfae",
    tool_color_button2: "#f8daaa",
    tool_color_text: "#773333",
    tool_color_bar: "#ddddff",
    tool_color_frame: "#000000",

    colors: [ 
        "#000000", "#FFFFFF",
        "#B47575", "#888888",
        "#FA9696", "#C096C0",
        "#FFB6FF", "#8080FF",
        "#25C7C9", "#E7E58D",
        "#E7962D", "#99CB7B",
        "#FCECE2", "#F9DDCF"
    ]
};

Neo.reservePen = {};
Neo.reserveEraser = {};

Neo.SLIDERTYPE_RED = 0;
Neo.SLIDERTYPE_GREEN = 1;
Neo.SLIDERTYPE_BLUE = 2;
Neo.SLIDERTYPE_ALPHA = 3;
Neo.SLIDERTYPE_SIZE = 4;

document.neo = Neo;

Neo.init = function() {
    var applets = document.getElementsByTagName('applet');
    if (applets.length == 0) {
        applets = document.getElementsByTagName('applet-dummy');
    }

    for (var i = 0; i < applets.length; i++) {
        var applet = applets[i];
        var name = applet.attributes.name.value;
        if (name == "paintbbs") {
            Neo.applet = applet;
            Neo.createContainer(applet);
            Neo.initConfig(applet);
            Neo.init2();
        }
    }
};

Neo.init2 = function() {
    var pageview = document.getElementById("pageView");
    pageview.style.width = Neo.config.applet_width + "px";
    pageview.style.height = Neo.config.applet_height + "px";

    Neo.canvas = document.getElementById("canvas");
    Neo.container = document.getElementById("container");
    Neo.toolsWrapper = document.getElementById("toolsWrapper");

    Neo.painter = new Neo.Painter();
    Neo.painter.build(Neo.canvas, Neo.config.width, Neo.config.height);

    Neo.container.oncontextmenu = function() {return false;};
//  Neo.painter.onUpdateCanvas = null;

    // 続きから描く
    if (Neo.config.image_canvas) {
        Neo.painter.loadImage(Neo.config.image_canvas);
    }

    // 描きかけの画像が見つかったとき
    if (sessionStorage.getItem('timestamp')) {
        setTimeout(function () {
            if (confirm("以前の編集データを復元しますか？")) {
                Neo.painter.loadSession();
            }
        }, 1);
    }

    window.addEventListener("beforeunload", function(e) { 
        if (!Neo.uploaded) {
            Neo.painter.saveSession();
        } else {
            Neo.painter.clearSession();
        }
    }, false);
}

Neo.initConfig = function(applet) {
    if (applet) {
        var name = applet.attributes.name.value || "neo";
        var appletWidth = applet.attributes.width;
        var appletHeight = applet.attributes.height;
        if (appletWidth) Neo.config.applet_width = parseInt(appletWidth.value);
        if (appletHeight) Neo.config.applet_height = parseInt(appletHeight.value);

        var params = applet.getElementsByTagName('param');
        for (var i = 0; i < params.length; i++) {
            var p = params[i];
            Neo.config[p.name] = p.value;

            if (p.name == "image_width") Neo.config.width = parseInt(p.value);
            if (p.name == "image_height") Neo.config.height = parseInt(p.value);
        }

        var e = document.getElementById("container");
        Neo.config.inherit_color = Neo.getInheritColor(e);
        if (!Neo.config.color_frame) Neo.config.color_frame = Neo.config.color_text;
    }

    Neo.config.reserves = [
        { size:1, color:"#000000", alpha:1.0, tool:Neo.Painter.TOOLTYPE_PEN },
        { size:5, color:"#FFFFFF", alpha:1.0, tool:Neo.Painter.TOOLTYPE_ERASER },
        { size:10, color:"#FFFFFF", alpha:1.0, tool:Neo.Painter.TOOLTYPE_ERASER },
    ];

    Neo.reservePen = Neo.clone(Neo.config.reserves[0]);
    Neo.reserveEraser = Neo.clone(Neo.config.reserves[1]);
};

Neo.initSkin = function() {
    var sheet = document.styleSheets[0];
    if (!sheet) return;

    Neo.styleSheet = sheet;

    var lightBorder = Neo.multColor(Neo.config.color_icon, 1.3);
    var darkBorder = Neo.multColor(Neo.config.color_icon, 0.7);
    var lightBar = Neo.multColor(Neo.config.color_bar, 1.3);
    var darkBar = Neo.multColor(Neo.config.color_bar, 0.7);
    var bgImage = Neo.backgroundImage();

    Neo.addRule(".NEO #container", "background-image", "url(" + bgImage + ")");
    Neo.addRule(".NEO .colorSlider .label", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .sizeSlider .label", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .layerControl .label1", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .layerControl .label0", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .toolTipOn .label", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .toolTipOff .label", "color", Neo.config.tool_color_text);

    Neo.addRule(".NEO #toolSet", "background-color", Neo.config.color_bk);
    Neo.addRule(".NEO #tools", "color", Neo.config.tool_color_text);
    Neo.addRule(".NEO .layerControl .bg", "border-bottom", "1px solid " + Neo.config.tool_color_text);


    Neo.addRule(".NEO .buttonOn", "color", Neo.config.color_text);
    Neo.addRule(".NEO .buttonOff", "color", Neo.config.color_text);

    Neo.addRule(".NEO .buttonOff", "background-color", Neo.config.color_icon);
    Neo.addRule(".NEO .buttonOff", "border-top", "1px solid ",  Neo.config.color_icon);
    Neo.addRule(".NEO .buttonOff", "border-left", "1px solid ", Neo.config.color_icon);
    Neo.addRule(".NEO .buttonOff", "box-shadow", "0 0 0 1px " + Neo.config.color_icon + ", 0 0 0 2px " + Neo.config.color_frame);

    Neo.addRule(".NEO .buttonOff:hover", "background-color", Neo.config.color_icon);
    Neo.addRule(".NEO .buttonOff:hover", "border-top", "1px solid " + lightBorder);
    Neo.addRule(".NEO .buttonOff:hover", "border-left", "1px solid " + lightBorder);
    Neo.addRule(".NEO .buttonOff:hover", "box-shadow", "0 0 0 1px " + Neo.config.color_iconselect + ", 0 0 0 2px " + Neo.config.color_frame);

    Neo.addRule(".NEO .buttonOff:active, .NEO .buttonOn", "background-color", darkBorder);
    Neo.addRule(".NEO .buttonOff:active, .NEO .buttonOn", "border-top", "1px solid " + darkBorder);
    Neo.addRule(".NEO .buttonOff:active, .NEO .buttonOn", "border-left", "1px solid " + darkBorder);
    Neo.addRule(".NEO .buttonOff:active, .NEO .buttonOn", "box-shadow", "0 0 0 1px " + Neo.config.color_iconselect + ", 0 0 0 2px " + Neo.config.color_frame);

    Neo.addRule(".NEO #canvas", "border", "1px solid " + Neo.config.color_frame);
    Neo.addRule(".NEO #scrollH, .NEO #scrollV", "background-color", Neo.config.color_icon);
    Neo.addRule(".NEO #scrollH, .NEO #scrollV", "box-shadow", "0 0 0 1px white" + ", 0 0 0 2px " + Neo.config.color_frame);

    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "background-color", Neo.config.color_bar);
    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "box-shadow", "0 0 0 1px " + Neo.config.color_icon);
    Neo.addRule(".NEO #scrollH div:hover, .NEO #scrollV div:hover", "box-shadow", "0 0 0 1px " + Neo.config.color_iconselect);

    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "border-top", "1px solid " + lightBar);
    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "border-left", "1px solid " + lightBar);
    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "border-right", "1px solid " + darkBar);
    Neo.addRule(".NEO #scrollH div, .NEO #scrollV div", "border-bottom", "1px solid " + darkBar);

    Neo.addRule(".NEO .toolTipOn", "background-color", Neo.multColor(Neo.config.tool_color_button, 0.7));
    Neo.addRule(".NEO .toolTipOff", "background-color", Neo.config.tool_color_button);
    Neo.addRule(".NEO .toolTipFixed", "background-color", Neo.config.tool_color_button2);

    Neo.addRule(".NEO .colorSlider, .NEO .sizeSlider", "background-color", Neo.config.tool_color_bar);
    Neo.addRule(".NEO .reserveControl", "background-color", Neo.config.tool_color_bar);
    Neo.addRule(".NEO .reserveControl", "background-color", Neo.config.tool_color_bar);
    Neo.addRule(".NEO .layerControl", "background-color", Neo.config.tool_color_bar);

    Neo.addRule(".NEO .colorTipOn, .NEO .colorTipOff", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
    Neo.addRule(".NEO .toolTipOn, .NEO .toolTipOff", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
    Neo.addRule(".NEO .toolTipFixed", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
    Neo.addRule(".NEO .colorSlider, .NEO .sizeSlider", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
    Neo.addRule(".NEO .reserveControl", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
    Neo.addRule(".NEO .layerControl", "box-shadow", "0 0 0 1px " + Neo.config.tool_color_frame);
};

Neo.addRule = function(selector, styleName, value, sheet) {
    if (!sheet) sheet = Neo.styleSheet;
    if (sheet.addRule) {
        sheet.addRule(selector, styleName + ":" + value, sheet.rules.length);

    } else if (sheet.insertRule) {
        var rule = selector + "{" + styleName + ":" + value + "}";
        var index = sheet.cssRules.length;
        sheet.insertRule(rule, index);
    }
};

Neo.getInheritColor = function(e) {
    var result = "#000000";
    while (e && e.style) {
        if (e.style.color != "") { 
            result = e.style.color; 
            break;
        }
        if (e.attributes["text"]) {
            result = e.attributes["text"].value; 
            break;
        }
        e = e.parentNode;
    }
    return result;
};

Neo.backgroundImage = function() {
    var c1 = Neo.painter.getColor(Neo.config.color_bk) | 0xff000000;
    var c2 = Neo.painter.getColor(Neo.config.color_bk2) | 0xff000000;
    var bgCanvas = document.createElement("canvas");
    bgCanvas.width = 16;
    bgCanvas.height = 16;
    var ctx = bgCanvas.getContext("2d");
    var imageData = ctx.getImageData(0, 0, 16, 16);
    var buf32 = new Uint32Array(imageData.data.buffer);
    var buf8 = new Uint8ClampedArray(imageData.data.buffer);
    var index = 0;
    for (var y = 0; y < 16; y++) {
        for (var x = 0; x < 16; x++) {
            buf32[index++] = (x == 14 || y == 14) ? c2 : c1;
        }
    }
    imageData.data.set(buf8);
    ctx.putImageData(imageData, 0, 0);
    return bgCanvas.toDataURL('image/png');
};

Neo.multColor = function(c, scale) {
    var r = Math.round(parseInt(c.substr(1, 2), 16) * scale);
    var g = Math.round(parseInt(c.substr(3, 2), 16) * scale);
    var b = Math.round(parseInt(c.substr(5, 2), 16) * scale);
    r = ("0" + Math.min(Math.max(r, 0), 255).toString(16)).substr(-2);
    g = ("0" + Math.min(Math.max(g, 0), 255).toString(16)).substr(-2);
    b = ("0" + Math.min(Math.max(b, 0), 255).toString(16)).substr(-2);
    return '#' + r + g + b;
};

Neo.initComponents = function() {
    document.getElementById("copyright").innerHTML += "v" + Neo.version;

    //アプレットのborderの動作をエミュレート
    var container = document.getElementById("container");
    container.addEventListener("mousedown", function(e) {
        container.style.borderColor = Neo.config.inherit_color;
        e.stopPropagation();
    }, false);
    document.addEventListener("mousedown", function(e) {
        container.style.borderColor = 'transparent';
    }, false);

    if (Neo.styleSheet) {
        Neo.addRule("*", "user-select", "none");
        Neo.addRule("*", "-webkit-user-select", "none");
    }
}

Neo.initButtons = function() {
    new Neo.Button().init("undo").onmouseup = function() {
        new Neo.UndoCommand(Neo.painter).execute();
    };
    new Neo.Button().init("redo").onmouseup = function () {
        new Neo.RedoCommand(Neo.painter).execute();
    };
    new Neo.Button().init("window").onmouseup = function() {
        new Neo.WindowCommand(Neo.painter).execute();
    };
    new Neo.Button().init("submit").onmouseup = function() {
        new Neo.SubmitCommand(Neo.painter).execute();
    };
    new Neo.Button().init("copyright").onmouseup = function() {
        new Neo.CopyrightCommand(Neo.painter).execute();
    };
    new Neo.Button().init("zoomPlus").onmouseup = function() {
        new Neo.ZoomPlusCommand(Neo.painter).execute();
    };
    new Neo.Button().init("zoomMinus").onmouseup = function() {
        new Neo.ZoomMinusCommand(Neo.painter).execute();
    };

    Neo.fillButton = new Neo.Button().init("fill", {type:'fill'});

    // toolTip
    Neo.penTip = new Neo.PenTip().init("pen");
    Neo.pen2Tip = new Neo.Pen2Tip().init("pen2");
    Neo.effectTip = new Neo.EffectTip().init("effect");
    Neo.effect2Tip = new Neo.Effect2Tip().init("effect2");
    Neo.eraserTip = new Neo.EraserTip().init("eraser");
    Neo.drawTip = new Neo.DrawTip().init("draw");
    Neo.maskTip = new Neo.MaskTip().init("mask");

    Neo.toolButtons = [Neo.fillButton, 
                       Neo.penTip, 
                       Neo.pen2Tip, 
                       Neo.effectTip,
                       Neo.effect2Tip,
                       Neo.drawTip,
                       Neo.eraserTip];

    // colorTip
    for (var i = 1; i <= 14; i++) {
        new Neo.ColorTip().init("color" + i, {index:i});
    };
    
    // colorSlider
    Neo.sliders[Neo.SLIDERTYPE_RED] = new Neo.ColorSlider().init(
        "sliderRed", {type:Neo.SLIDERTYPE_RED});
    Neo.sliders[Neo.SLIDERTYPE_GREEN] = new Neo.ColorSlider().init(
        "sliderGreen", {type:Neo.SLIDERTYPE_GREEN});
    Neo.sliders[Neo.SLIDERTYPE_BLUE] = new Neo.ColorSlider().init(
        "sliderBlue", {type:Neo.SLIDERTYPE_BLUE});
    Neo.sliders[Neo.SLIDERTYPE_ALPHA] = new Neo.ColorSlider().init(
        "sliderAlpha", {type:Neo.SLIDERTYPE_ALPHA});

    // sizeSlider
    Neo.sliders[Neo.SLIDERTYPE_SIZE] = new Neo.SizeSlider().init(
        "sliderSize", {type:Neo.SLIDERTYPE_SIZE});

    // reserveControl
    for (var i = 1; i <= 3; i++) {
        new Neo.ReserveControl().init("reserve" + i, {index:i});    
    };

    new Neo.LayerControl().init("layerControl");
    new Neo.ScrollBarButton().init("scrollH");
    new Neo.ScrollBarButton().init("scrollV");
};

Neo.start = function(isApp) {
    Neo.initSkin();
    Neo.initComponents();
    Neo.initButtons();

    Neo.isApp = isApp;
    if (Neo.applet) {
        var name = Neo.applet.attributes.name.value || "paintbbs";
        Neo.applet.outerHTML = "";
        document[name] = Neo;
        
        Neo.resizeCanvas();
        Neo.container.style.visibility = "visible";

        if (Neo.isApp) {
            var ipc = require('electron').ipcRenderer;
            ipc.sendToHost('neo-status', 'ok');
        }
    }
};

/*
-----------------------------------------------------------------------
UIの更新
-----------------------------------------------------------------------
*/

Neo.updateUI = function() {
    var current = Neo.painter.tool.getToolButton();
    for (var i = 0; i < Neo.toolButtons.length; i++) {
        var toolTip = Neo.toolButtons[i];
        toolTip.setSelected((current == toolTip) ? true : false);
        if (current == toolTip) {
            toolTip.update();
        }
    }

    Neo.updateUIColor(true, false);
}

Neo.updateUIColor = function(updateSlider, updateColorTip) {
    for (var i = 0; i < Neo.toolButtons.length; i++) {
        var toolTip = Neo.toolButtons[i];
        toolTip.update();
    }

    if (updateSlider) {
        for (var i = 0; i < Neo.sliders.length; i++) {
            var slider = Neo.sliders[i];
            slider.update();
        }
    }

    // パレットを変更するとき
    if (updateColorTip) {
        var colorTip = Neo.ColorTip.getCurrent();
        if (colorTip) {
            colorTip.setColor(Neo.painter.foregroundColor);
        }
    }
};

/*
-----------------------------------------------------------------------
リサイズ対応
-----------------------------------------------------------------------
*/

Neo.updateWindow = function() {
    if (Neo.fullScreen) {
        document.getElementById("windowView").style.display = "block";
        document.getElementById("windowView").appendChild(Neo.container);

    } else {
        document.getElementById("windowView").style.display = "none";
        document.getElementById("pageView").appendChild(Neo.container);
    }
    Neo.resizeCanvas();
};

Neo.resizeCanvas = function() {
    var appletWidth = Neo.container.clientWidth;
    var appletHeight = Neo.container.clientHeight;

    var width0 = Neo.painter.canvasWidth * Neo.painter.zoom;
    var height0 = Neo.painter.canvasHeight * Neo.painter.zoom;

    var width = (width0 < appletWidth - 100) ? width0 : appletWidth - 100;
    var height = (height0 < appletHeight - 120) ? height0 : appletHeight - 120;

    Neo.painter.destWidth = width;
    Neo.painter.destHeight = height;

    Neo.painter.destCanvas.width = width;
    Neo.painter.destCanvas.height = height;
    Neo.painter.destCanvasCtx = Neo.painter.destCanvas.getContext("2d");
    Neo.painter.destCanvasCtx.imageSmoothingEnabled = false;
    Neo.painter.destCanvasCtx.mozImageSmoothingEnabled = false;

    Neo.canvas.style.width = width + "px";
    Neo.canvas.style.height = height + "px";
    Neo.toolsWrapper.style.height = Neo.container.clientHeight + "px";

    Neo.painter.setZoom(Neo.painter.zoom);
    Neo.painter.updateDestCanvas();
};

/*
-----------------------------------------------------------------------
投稿
-----------------------------------------------------------------------
*/

Neo.clone = function(src) {
    var dst = {};
    for (var k in src) {
        dst[k] = src[k];
    }
    return dst;
};

Neo.getSizeString = function(len) {
    var result = String(len);
    while (result.length < 8) {
        result = "0" + result;
    }
    return result;
};

Neo.openURL = function(url) {
    if (Neo.isApp) {
        require('electron').shell.openExternal(url);

    } else {
        location.href = url;
    }
};

Neo.submit = function(board, blob) {
    var url = board + Neo.config.url_save;
    console.log("submit url=" + url);
    var header = new Blob([Neo.config.send_header || ""]);

    var headerLength = this.getSizeString(header.size);
    var imgLength = this.getSizeString(blob.size);
    var body = new Blob(['P', // PaintBBS
                         headerLength,
                         header,
                         imgLength,
                         '\r\n', 
                         blob], {type: 'blob'});

    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onload = function (e) {
        console.log(request.response);
        Neo.uploaded = true;

        var url = Neo.config.url_exit;
        if (url[0] == '/') {
            url = url.replace(/^.*\//, ''); //よくわかんないけどとりあえず
        }
        var exitURL = board + url;
        location.href = exitURL;
    }
    request.send(body);
};

/*
-----------------------------------------------------------------------
LiveConnect
-----------------------------------------------------------------------
*/

Neo.getColors = function() {
    console.log("getColors");
    return Neo.config.colors.join('\n');
};

Neo.setColors = function(colors) {
    console.log("setColors");
    var array = colors.split('\n');
    for (var i = 0; i < 14; i++) {
        var color = array[i];
        Neo.config.colors[i] = color;
        Neo.colorTips[i].setColor(color);
    }
};

/*
-----------------------------------------------------------------------
DOMツリーの作成
-----------------------------------------------------------------------
*/

Neo.createContainer = function(applet) {
    var neo = document.createElement("div");
    neo.className = "NEO";
    neo.id = "NEO";
    neo.innerHTML = (function() {/*

<script src="http://code.jquery.com/jquery-1.11.1.min.js"></script>

<div id="pageView" style="width:450px; height:470px; margin:auto;">
    <div id="container" style="visibility:hidden;">
        <div id="center">
            <div id="painterContainer">
                <div id="painterWrapper">
                    <div id="upper">
                        <div id="redo">やり直し</div>
                        <div id="undo">元に戻す</div>
                        <div id="fill">塗り潰し</div>
                    </div>
                    <div id="painter">
                        <div id="canvas">
                            <div id="scrollH"></div>
                            <div id="scrollV"></div>
                            <div id="zoomPlusWrapper">
                                <div id="zoomPlus">+</div>
                            </div>
                            <div id="zoomMinusWrapper">
                                <div id="zoomMinus">-</div>
                            </div>
                        </div>
                    </div>
                    <div id="lower">
                    </div>
                </div>
                <div id="toolsWrapper">
                    <div id="tools">
                        <div id="toolSet">
                            <div id="pen"></div>
                            <div id="pen2"></div>
                            <div id="effect"></div>
                            <div id="effect2"></div>
                            <div id="eraser"></div>
                            <div id="draw"></div>
                            <div id="mask"></div>

                            <div class="colorTips">
                                <div id="color2"></div><div id="color1"></div><br>
                                <div id="color4"></div><div id="color3"></div><br>
                                <div id="color6"></div><div id="color5"></div><br>
                                <div id="color8"></div><div id="color7"></div><br>
                                <div id="color10"></div><div id="color9"></div><br>
                                <div id="color12"></div><div id="color11"></div><br>
                                <div id="color14"></div><div id="color13"></div>
                            </div>

                            <div id="sliderRed"></div>
                            <div id="sliderGreen"></div>
                            <div id="sliderBlue"></div>
                            <div id="sliderAlpha"></div>
                            <div id="sliderSize"></div>

                            <div class="reserveControl" style="margin-top:4px;">
                                <div id="reserve1"></div>
                                <div id="reserve2"></div>
                                <div id="reserve3"></div>
                            </div>
                            <div id="layerControl" style="margin-top:6px;"></div>

                            <!--<div id="toolPad" style="height:20px;"></div>-->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div id="headerButtons">
            <div id="window">窓</div>
        </div>
        <div id="footerButtons">
            <div id="submit">投稿</div>
            <div id="copyright">(C)しいちゃん PaintBBS NEO</div>
        </div>
    </div>
</div>

<div id="windowView" style="display: none;">

</div>


*/}).toString().match(/\/\*([^]*)\*\//)[1];

    var parent = applet.parentNode;
    parent.appendChild(neo);
    parent.insertBefore(neo, applet);

//  applet.style.display = "none";
};

