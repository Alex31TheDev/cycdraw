// Load canvaskit & utils
util.executeTag("canvaskitloader");
const CanvasKitUtil = ModuleLoader.loadModuleFromTag("canvaskitutil")(CanvasKit);

// Start timing
Benchmark.clearExcept("load_total");
Benchmark.startTiming("draw_total");

const surface = (() => {
    const width = 800,
        height = 600;

    // Create a surface
    const surface = CanvasKit.MakeSurface(width, height),
        canvas = surface.getCanvas();

    // Clear the canvas with a white background
    canvas.clear(CanvasKit.WHITE);

    // Draw a red circle
    const paintCircle = new CanvasKit.Paint();
    paintCircle.setAntiAlias(true);
    paintCircle.setColor(CanvasKit.RED);
    canvas.drawCircle(150, 350, 80, paintCircle);

    // Draw a blue rectangle
    const paintRectangle = new CanvasKit.Paint();
    paintRectangle.setAntiAlias(true);
    paintRectangle.setColor(CanvasKit.BLUE);
    canvas.drawRect(CanvasKit.XYWHRect(300, 90, 200, 140), paintRectangle);

    // Draw a green triangle
    const paintTriangle = new CanvasKit.Paint();
    paintTriangle.setAntiAlias(true);
    paintTriangle.setColor(CanvasKit.GREEN);

    const pathTriangle = new CanvasKit.Path();
    pathTriangle.moveTo(600, 360);
    pathTriangle.lineTo(700, 180);
    pathTriangle.lineTo(750, 400);
    pathTriangle.close();
    canvas.drawPath(pathTriangle, paintTriangle);

    // Draw a magenta star
    const paintStar = new CanvasKit.Paint();
    paintStar.setAntiAlias(true);
    paintStar.setColor(CanvasKit.MAGENTA);

    const centerX = 500,
        centerY = 500,
        innerRadius = 40,
        outerRadius = 80,
        points = 5;

    const pathStar = new CanvasKit.Path();

    for (let i = 0; i < points; i++) {
        const angle = (i * (2 * Math.PI)) / points,
            outerX = centerX + outerRadius * Math.cos(angle),
            outerY = centerY + outerRadius * Math.sin(angle);

        if (i === 0) {
            pathStar.moveTo(outerX, outerY);
        } else {
            pathStar.lineTo(outerX, outerY);
        }

        const innerAngle = angle + Math.PI / points,
            innerX = centerX + innerRadius * Math.cos(innerAngle),
            innerY = centerY + innerRadius * Math.sin(innerAngle);

        pathStar.lineTo(innerX, innerY);
    }

    pathStar.close();
    canvas.drawPath(pathStar, paintStar);

    // Draw a yellow line
    const paintLine = new CanvasKit.Paint();
    paintLine.setAntiAlias(true);
    paintLine.setColor(CanvasKit.YELLOW);
    paintLine.setStrokeWidth(5);
    canvas.drawLine(50, 100, 750, 500, paintLine);

    // Draw a thick black line
    const paintThickLine = new CanvasKit.Paint();
    paintThickLine.setAntiAlias(true);
    paintThickLine.setColor(CanvasKit.BLACK);
    paintThickLine.setStrokeWidth(15);
    canvas.drawLine(100, 550, 700, 150, paintThickLine);

    // Cleanup
    paintCircle.delete();
    paintRectangle.delete();
    paintTriangle.delete();
    paintStar.delete();
    paintLine.delete();
    paintThickLine.delete();
    pathTriangle.delete();
    pathStar.delete();

    return surface;
})();

Benchmark.stopTiming("draw_total");

// Encode image
Benchmark.startTiming("encode_png");
const pngBytes = CanvasKitUtil.encodeSurface(surface);
Benchmark.stopTiming("encode_png");
surface.delete();

// Send image & benchmark times
msg.reply(Benchmark.getAll(), {
    file: {
        name: "wireless.png",
        data: pngBytes
    }
});
