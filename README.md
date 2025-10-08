# Svg2VectorConverter
SVG to Vector Drawable tool is a web-based application designed to convert SVG (Scalable Vector Graphics) files into Android Vector Drawable XML format.

Tool Description: The tool supports uploading multiple SVG files (up to 10 files at once, each max 5MB).

It provides an interactive user interface with drag-and-drop file upload and a file browsing option.

Users can preview both the original SVG and the converted Vector Drawable XML output side-by-side.

Conversion options include selecting size presets (Small, Medium, Large, Extra Large) or specifying custom width and height in dp.

Users can choose a default fill color for the converted drawable and whether the output XML should be formatted.

The tool features zoom controls and an optional grid overlay for better visualization of the vector paths.

Output actions include copying the XML to clipboard, downloading individual Vector Drawable files, or downloading all converted files at once.

It tracks recent files for quick access and stores user preferences and theme settings in local storage.

The tool supports common SVG vector elements such as paths, circles, rectangles, polygons, polylines, ellipses, and lines.

Includes a dark mode toggle for UI theme customization.

Backend logic is implemented in JavaScript to parse SVG and generate Vector Drawable XML dynamically, ensuring the converted graphics maintain the main vector elements supported in Android.

This tool effectively bridges the gap for Android developers by simplifying the conversion of SVG assets into Vector Drawable resources ready for integration into Android apps,
