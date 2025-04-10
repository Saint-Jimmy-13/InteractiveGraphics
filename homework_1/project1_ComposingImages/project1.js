// bgImg is the background image to be modified.
// fgImg is the foreground image.
// fgOpac is the opacity of the foreground image.
// fgPos is the position of the foreground image in pixels. It can be negative and (0,0) means the top-left pixels of the foreground and background are aligned.
function composite(bgImg, fgImg, fgOpac, fgPos) {
    const bgData = bgImg.data;
    const fgData = fgImg.data;

    console.log(bgData);
    console.log(fgData);

    const bgWidth = bgImg.width;
    const bgHeight = bgImg.height;
    const fgWidth = fgImg.width;
    const fgHeight = fgImg.height;

    for (let y = 0; y < fgHeight; ++y) {
        for (let x = 0; x < fgWidth; ++x) {
            const bgX = fgPos.x + x;
            const bgY = fgPos.y + y;

            // Skip pixels outside the background image
            if (bgX < 0 || bgX >= bgWidth || bgY < 0 || bgY >= bgHeight) {
                continue;
            }

            const fgIdx = (y * fgWidth + x) * 4;
            const bgIdx = (bgY * bgWidth + bgX) * 4;

            const fgR = fgData[fgIdx + 0];
            const fgG = fgData[fgIdx + 1];
            const fgB = fgData[fgIdx + 2];
            const fgA = (fgData[fgIdx + 3] / 255 ) * fgOpac;

            const bgR = bgData[bgIdx];
            const bgG = bgData[bgIdx + 1];
            const bgB = bgData[bgIdx + 2];
            const bgA = bgData[bgIdx + 3] / 255;

            // alpha = alpha_f + (1 - alpha_f) * alpha_b
            const totA = fgA + (1 - fgA) * bgA;

            // Avoid division by zero
            if (totA === 0) {
                continue;
            }

            // Alpha Blending: (alpha_f * c_f + (1 - alpha_f) * alpha_b * c_b) /
            bgData[bgIdx + 0] = Math.round((fgA * fgR + (1 - fgA) * bgA * bgR) / totA); // Red
            bgData[bgIdx + 1] = Math.round((fgA * fgG + (1 - fgA) * bgA * bgG) / totA); // Green
            bgData[bgIdx + 2] = Math.round((fgA * fgB + (1 - fgA) * bgA * bgB) / totA); // Blue
            bgData[bgIdx + 3] = Math.round(totA);   // Alpha
        }
    }
    console.log(bgData);
    console.log(fgData);
}
