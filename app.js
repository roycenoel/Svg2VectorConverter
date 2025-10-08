// SVG to VectorDrawable Converter - Main Application
class SVGConverter {
    constructor() {
        this.files = [];
        this.activeFileIndex = 0;
        this.recentFiles = JSON.parse(localStorage.getItem('recentFiles') || '[]');
        this.preferences = JSON.parse(localStorage.getItem('preferences') || '{}');
        this.zoomLevel = 1;
        this.showGrid = false;
        
        // Default data
        this.defaultSizes = [
            {name: "Small", width: 24, height: 24},
            {name: "Medium", width: 32, height: 32},
            {name: "Large", width: 48, height: 48},
            {name: "Extra Large", width: 64, height: 64}
        ];
        
        this.supportedElements = [
            "path", "circle", "rect", "polygon", "polyline", "ellipse", "line"
        ];
        
        this.defaultColors = [
            "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
            "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF",
            "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"
        ];

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.setupColorPresets();
        this.loadRecentFiles();
        this.applyPreferences();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());

        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Options
        document.getElementById('sizePreset').addEventListener('change', (e) => this.handleSizePreset(e));
        document.getElementById('widthInput').addEventListener('input', () => this.updateConversion());
        document.getElementById('heightInput').addEventListener('input', () => this.updateConversion());
        document.getElementById('fillColorPicker').addEventListener('change', () => this.updateConversion());
        document.getElementById('formatXml').addEventListener('change', () => this.updateConversion());

        // Preview controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomPreview(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomPreview(0.8));
        document.getElementById('toggleGrid').addEventListener('click', () => this.toggleGrid());

        // Output actions
        document.getElementById('copyBtn').addEventListener('click', () => this.copyXML());
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadXML());
        document.getElementById('downloadAllBtn').addEventListener('click', () => this.downloadAll());
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-color-scheme') || 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-color-scheme', theme);
        const themeIcon = document.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        localStorage.setItem('theme', theme);
    }

    setupColorPresets() {
        const colorPresets = document.getElementById('colorPresets');
        this.defaultColors.forEach(color => {
            const preset = document.createElement('div');
            preset.className = 'color-preset';
            preset.style.backgroundColor = color;
            preset.title = color;
            preset.addEventListener('click', () => {
                document.getElementById('fillColorPicker').value = color;
                this.updateColorPresetSelection(color);
                this.updateConversion();
            });
            colorPresets.appendChild(preset);
        });
    }

    updateColorPresetSelection(selectedColor) {
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.classList.toggle('active', preset.style.backgroundColor === selectedColor);
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.add('drag-over');
    }

    handleDragLeave(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('drag-over');
    }

    handleDrop(e) {
        e.preventDefault();
        document.getElementById('uploadArea').classList.remove('drag-over');
        this.handleFiles(e.dataTransfer.files);
    }

    async handleFiles(fileList) {
        const files = Array.from(fileList).filter(file => 
            file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')
        );

        if (files.length === 0) {
            this.showNotification('Please select valid SVG files', 'error');
            return;
        }

        if (files.length > 10) {
            this.showNotification('Maximum 10 files allowed at once', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            this.files = [];
            
            for (let file of files) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    this.showNotification(`File ${file.name} is too large (max 5MB)`, 'warning');
                    continue;
                }

                const content = await this.readFile(file);
                const fileData = {
                    name: file.name,
                    size: file.size,
                    content: content,
                    xml: null,
                    lastModified: file.lastModified
                };

                this.files.push(fileData);
            }

            if (this.files.length > 0) {
                this.activeFileIndex = 0;
                this.showProcessingSection();
                this.updateFileList();
                this.updatePreview();
                this.updateConversion();
                this.saveToRecent();
            }

        } catch (error) {
            this.showNotification('Error processing files: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    showProcessingSection() {
        document.getElementById('processingSection').classList.remove('hidden');
        document.getElementById('processingSection').classList.add('fade-in');
    }

    updateFileList() {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        this.files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = `file-item ${index === this.activeFileIndex ? 'active' : ''}`;
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
                <div class="file-actions">
                    <button class="file-remove" data-index="${index}">✕</button>
                </div>
            `;

            fileItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('file-remove')) {
                    this.selectFile(index);
                }
            });

            fileItem.querySelector('.file-remove').addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeFile(index);
            });

            fileList.appendChild(fileItem);
        });

        // Update download all button
        document.getElementById('downloadAllBtn').disabled = this.files.length <= 1;
    }

    selectFile(index) {
        this.activeFileIndex = index;
        this.updateFileList();
        this.updatePreview();
        this.updateOutput();
    }

    removeFile(index) {
        this.files.splice(index, 1);
        
        if (this.files.length === 0) {
            document.getElementById('processingSection').classList.add('hidden');
            return;
        }

        if (this.activeFileIndex >= this.files.length) {
            this.activeFileIndex = this.files.length - 1;
        }

        this.updateFileList();
        this.updatePreview();
        this.updateOutput();
    }

    updatePreview() {
        if (this.files.length === 0) return;

        const activeFile = this.files[this.activeFileIndex];
        const originalPreview = document.getElementById('originalPreview');
        const vectorPreview = document.getElementById('vectorPreview');

        // Show original SVG
        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(activeFile.content, 'image/svg+xml');
            const svgElement = svgDoc.documentElement.cloneNode(true);
            
            originalPreview.innerHTML = '';
            originalPreview.appendChild(svgElement);
            this.applyPreviewTransform(originalPreview);
        } catch (error) {
            originalPreview.innerHTML = '<div class="preview-placeholder">Invalid SVG</div>';
        }

        // Show converted vector (if available)
        if (activeFile.xml) {
            try {
                const vectorSvg = this.vectorXmlToSvg(activeFile.xml);
                vectorPreview.innerHTML = vectorSvg;
                this.applyPreviewTransform(vectorPreview);
            } catch (error) {
                vectorPreview.innerHTML = '<div class="preview-placeholder">Conversion error</div>';
            }
        } else {
            vectorPreview.innerHTML = '<div class="preview-placeholder">Converting...</div>';
        }
    }

    applyPreviewTransform(container) {
        const svg = container.querySelector('svg');
        if (svg) {
            svg.style.transform = `scale(${this.zoomLevel})`;
            container.classList.toggle('grid-bg', this.showGrid);
        }
    }

    zoomPreview(factor) {
        this.zoomLevel *= factor;
        this.zoomLevel = Math.max(0.1, Math.min(3, this.zoomLevel));
        this.updatePreview();
    }

    toggleGrid() {
        this.showGrid = !this.showGrid;
        this.updatePreview();
    }

    handleSizePreset(e) {
        const preset = e.target.value;
        if (preset === 'custom') return;

        const size = parseInt(preset);
        document.getElementById('widthInput').value = size;
        document.getElementById('heightInput').value = size;
        this.updateConversion();
    }

    updateConversion() {
        if (this.files.length === 0) return;

        const activeFile = this.files[this.activeFileIndex];
        try {
            const xml = this.convertSvgToVectorDrawable(activeFile.content);
            activeFile.xml = xml;
            this.updatePreview();
            this.updateOutput();
        } catch (error) {
            this.showNotification('Conversion error: ' + error.message, 'error');
        }
    }

    convertSvgToVectorDrawable(svgContent) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgElement = svgDoc.documentElement;

        if (svgElement.nodeName !== 'svg') {
            throw new Error('Invalid SVG file');
        }

        // Get dimensions
        const width = document.getElementById('widthInput').value || '24';
        const height = document.getElementById('heightInput').value || '24';
        const defaultFill = document.getElementById('fillColorPicker').value;
        
        // Get viewBox
        let viewBox = svgElement.getAttribute('viewBox');
        if (!viewBox) {
            const svgWidth = svgElement.getAttribute('width') || width;
            const svgHeight = svgElement.getAttribute('height') || height;
            viewBox = `0 0 ${parseFloat(svgWidth)} ${parseFloat(svgHeight)}`;
        }

        const [, , viewportWidth, viewportHeight] = viewBox.split(' ').map(Number);

        // Start building the vector XML
        let xml = `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n`;
        xml += `    android:width="${width}dp"\n`;
        xml += `    android:height="${height}dp"\n`;
        xml += `    android:viewportWidth="${viewportWidth}"\n`;
        xml += `    android:viewportHeight="${viewportHeight}">\n`;

        // Process all supported elements
        this.processElements(svgElement, xml, defaultFill, (result) => {
            xml = result;
        });

        xml += `</vector>`;

        // Format if requested
        if (document.getElementById('formatXml').checked) {
            xml = this.formatXml(xml);
        }

        return xml;
    }

    processElements(parent, xml, defaultFill, callback) {
        const children = parent.children;
        
        for (let element of children) {
            const tagName = element.tagName.toLowerCase();
            
            if (this.supportedElements.includes(tagName)) {
                xml += this.convertElement(element, defaultFill);
            } else if (tagName === 'g' || tagName === 'svg') {
                // Recursively process groups
                this.processElements(element, xml, defaultFill, (result) => {
                    xml = result;
                });
            }
        }
        
        callback(xml);
    }

    convertElement(element, defaultFill) {
        const tagName = element.tagName.toLowerCase();
        let pathData = '';
        let fill = element.getAttribute('fill') || element.getAttribute('style')?.match(/fill:\s*([^;]+)/)?.[1] || defaultFill;
        let stroke = element.getAttribute('stroke') || element.getAttribute('style')?.match(/stroke:\s*([^;]+)/)?.[1];
        let strokeWidth = element.getAttribute('stroke-width') || element.getAttribute('style')?.match(/stroke-width:\s*([^;]+)/)?.[1];

        // Clean up color values
        if (fill === 'none') fill = null;
        if (stroke === 'none') stroke = null;

        switch (tagName) {
            case 'path':
                pathData = element.getAttribute('d');
                break;
            case 'rect':
                pathData = this.rectToPath(element);
                break;
            case 'circle':
                pathData = this.circleToPath(element);
                break;
            case 'ellipse':
                pathData = this.ellipseToPath(element);
                break;
            case 'line':
                pathData = this.lineToPath(element);
                break;
            case 'polygon':
                pathData = this.polygonToPath(element);
                break;
            case 'polyline':
                pathData = this.polylineToPath(element);
                break;
        }

        if (!pathData) return '';

        let pathXml = `    <path android:pathData="${pathData}"`;
        
        if (fill && fill !== 'transparent') {
            pathXml += `\n        android:fillColor="${fill}"`;
        }
        
        if (stroke && stroke !== 'transparent') {
            pathXml += `\n        android:strokeColor="${stroke}"`;
            if (strokeWidth) {
                pathXml += `\n        android:strokeWidth="${strokeWidth}"`;
            }
        }
        
        pathXml += '/>\n';
        return pathXml;
    }

    rectToPath(rect) {
        const x = parseFloat(rect.getAttribute('x') || '0');
        const y = parseFloat(rect.getAttribute('y') || '0');
        const width = parseFloat(rect.getAttribute('width') || '0');
        const height = parseFloat(rect.getAttribute('height') || '0');
        const rx = parseFloat(rect.getAttribute('rx') || '0');
        const ry = parseFloat(rect.getAttribute('ry') || rx || '0');

        if (rx === 0 && ry === 0) {
            return `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`;
        } else {
            // Rounded rectangle - simplified version
            return `M${x + rx},${y} L${x + width - rx},${y} Q${x + width},${y} ${x + width},${y + ry} L${x + width},${y + height - ry} Q${x + width},${y + height} ${x + width - rx},${y + height} L${x + rx},${y + height} Q${x},${y + height} ${x},${y + height - ry} L${x},${y + ry} Q${x},${y} ${x + rx},${y} Z`;
        }
    }

    circleToPath(circle) {
        const cx = parseFloat(circle.getAttribute('cx') || '0');
        const cy = parseFloat(circle.getAttribute('cy') || '0');
        const r = parseFloat(circle.getAttribute('r') || '0');
        
        return `M${cx - r},${cy} A${r},${r} 0 1,0 ${cx + r},${cy} A${r},${r} 0 1,0 ${cx - r},${cy}`;
    }

    ellipseToPath(ellipse) {
        const cx = parseFloat(ellipse.getAttribute('cx') || '0');
        const cy = parseFloat(ellipse.getAttribute('cy') || '0');
        const rx = parseFloat(ellipse.getAttribute('rx') || '0');
        const ry = parseFloat(ellipse.getAttribute('ry') || '0');
        
        return `M${cx - rx},${cy} A${rx},${ry} 0 1,0 ${cx + rx},${cy} A${rx},${ry} 0 1,0 ${cx - rx},${cy}`;
    }

    lineToPath(line) {
        const x1 = parseFloat(line.getAttribute('x1') || '0');
        const y1 = parseFloat(line.getAttribute('y1') || '0');
        const x2 = parseFloat(line.getAttribute('x2') || '0');
        const y2 = parseFloat(line.getAttribute('y2') || '0');
        
        return `M${x1},${y1} L${x2},${y2}`;
    }

    polygonToPath(polygon) {
        const points = polygon.getAttribute('points')?.trim();
        if (!points) return '';
        
        const coords = points.split(/[\s,]+/).filter(Boolean);
        if (coords.length < 4) return '';
        
        let path = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
            path += ` L${coords[i]},${coords[i + 1]}`;
        }
        path += ' Z';
        
        return path;
    }

    polylineToPath(polyline) {
        const points = polyline.getAttribute('points')?.trim();
        if (!points) return '';
        
        const coords = points.split(/[\s,]+/).filter(Boolean);
        if (coords.length < 4) return '';
        
        let path = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
            path += ` L${coords[i]},${coords[i + 1]}`;
        }
        
        return path;
    }

    vectorXmlToSvg(xml) {
        // Convert vector XML back to SVG for preview
        const match = xml.match(/android:viewportWidth="([^"]+)"/);
        const viewportWidth = match ? match[1] : '24';
        const viewportHeightMatch = xml.match(/android:viewportHeight="([^"]+)"/);
        const viewportHeight = viewportHeightMatch ? viewportHeightMatch[1] : '24';

        let svg = `<svg viewBox="0 0 ${viewportWidth} ${viewportHeight}" xmlns="http://www.w3.org/2000/svg">`;
        
        const pathMatches = xml.matchAll(/<path[^>]*android:pathData="([^"]+)"[^>]*(?:android:fillColor="([^"]+)")?[^>]*(?:android:strokeColor="([^"]+)")?[^>]*(?:android:strokeWidth="([^"]+)")?[^>]*\/>/g);
        
        for (let match of pathMatches) {
            const [, pathData, fillColor, strokeColor, strokeWidth] = match;
            svg += `<path d="${pathData}"`;
            if (fillColor) svg += ` fill="${fillColor}"`;
            if (strokeColor) svg += ` stroke="${strokeColor}"`;
            if (strokeWidth) svg += ` stroke-width="${strokeWidth}"`;
            svg += '/>';
        }
        
        svg += '</svg>';
        return svg;
    }

    formatXml(xml) {
        // Simple XML formatting
        return xml.replace(/></g, '>\n<')
                  .replace(/\n\s*\n/g, '\n')
                  .split('\n')
                  .map((line, index) => {
                      if (index === 0) return line;
                      const depth = (line.match(/^\s*<\//) ? -1 : 0) + (line.match(/<[^\/][^>]*[^\/]>/g) || []).length;
                      return '    '.repeat(Math.max(0, depth)) + line.trim();
                  })
                  .join('\n');
    }

    updateOutput() {
        if (this.files.length === 0 || !this.files[this.activeFileIndex].xml) {
            document.getElementById('xmlOutput').value = '';
            document.getElementById('copyBtn').disabled = true;
            document.getElementById('downloadBtn').disabled = true;
            return;
        }

        const activeFile = this.files[this.activeFileIndex];
        document.getElementById('xmlOutput').value = activeFile.xml;
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('downloadBtn').disabled = false;

        // Update stats
        const originalSize = new Blob([activeFile.content]).size;
        const xmlSize = new Blob([activeFile.xml]).size;
        const compression = ((1 - xmlSize / originalSize) * 100).toFixed(1);
        
        document.getElementById('outputStats').textContent = 
            `${this.formatFileSize(xmlSize)} • ${compression}% smaller`;
    }

    async copyXML() {
        const xml = document.getElementById('xmlOutput').value;
        try {
            await navigator.clipboard.writeText(xml);
            const copyBtn = document.getElementById('copyBtn');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
            this.showNotification('XML copied to clipboard', 'success');
        } catch (error) {
            this.showNotification('Failed to copy to clipboard', 'error');
        }
    }

    downloadXML() {
        if (this.files.length === 0) return;
        
        const activeFile = this.files[this.activeFileIndex];
        const filename = activeFile.name.replace(/\.svg$/i, '.xml');
        this.downloadFile(activeFile.xml, filename, 'application/xml');
        this.showNotification('File downloaded', 'success');
    }

    downloadAll() {
        if (this.files.length <= 1) return;

        this.showLoading(true);
        
        // Create a zip-like structure (simple approach)
        const files = this.files.map(file => ({
            name: file.name.replace(/\.svg$/i, '.xml'),
            content: file.xml
        }));

        // For simplicity, download as separate files
        files.forEach((file, index) => {
            setTimeout(() => {
                this.downloadFile(file.content, file.name, 'application/xml');
                if (index === files.length - 1) {
                    this.showLoading(false);
                    this.showNotification('All files downloaded', 'success');
                }
            }, index * 100);
        });
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    saveToRecent() {
        if (this.files.length === 0) return;

        const recentFile = {
            name: this.files[0].name,
            date: new Date().toISOString(),
            content: this.files[0].content
        };

        this.recentFiles = this.recentFiles.filter(file => file.name !== recentFile.name);
        this.recentFiles.unshift(recentFile);
        this.recentFiles = this.recentFiles.slice(0, 10); // Keep only 10 recent files

        localStorage.setItem('recentFiles', JSON.stringify(this.recentFiles));
        this.loadRecentFiles();
    }

    loadRecentFiles() {
        const recentSection = document.getElementById('recentSection');
        const recentFiles = document.getElementById('recentFiles');
        
        if (this.recentFiles.length === 0) {
            recentSection.style.display = 'none';
            return;
        }

        recentSection.style.display = 'block';
        recentFiles.innerHTML = '';

        this.recentFiles.forEach(file => {
            const recentFile = document.createElement('div');
            recentFile.className = 'recent-file';
            recentFile.innerHTML = `
                <div class="recent-file-name">${file.name}</div>
                <div class="recent-file-date">${new Date(file.date).toLocaleDateString()}</div>
            `;
            
            recentFile.addEventListener('click', () => {
                this.loadRecentFile(file);
            });
            
            recentFiles.appendChild(recentFile);
        });
    }

    async loadRecentFile(file) {
        const fakeFile = new File([file.content], file.name, { type: 'image/svg+xml' });
        await this.handleFiles([fakeFile]);
    }

    applyPreferences() {
        if (this.preferences.defaultSize) {
            document.getElementById('sizePreset').value = this.preferences.defaultSize;
        }
        if (this.preferences.defaultColor) {
            document.getElementById('fillColorPicker').value = this.preferences.defaultColor;
        }
    }

    savePreferences() {
        this.preferences = {
            defaultSize: document.getElementById('sizePreset').value,
            defaultColor: document.getElementById('fillColorPicker').value
        };
        localStorage.setItem('preferences', JSON.stringify(this.preferences));
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ';
        
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${icon}</div>
                <div class="notification-text">
                    <div class="notification-message">${message}</div>
                </div>
            </div>
        `;

        document.getElementById('notifications').appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Add slide out animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes slideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(styleSheet);

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new SVGConverter();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'o':
                e.preventDefault();
                document.getElementById('fileInput').click();
                break;
            case 'c':
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    document.getElementById('copyBtn').click();
                }
                break;
            case 's':
                e.preventDefault();
                document.getElementById('downloadBtn').click();
                break;
        }
    }
});