class FileUploader {
    constructor() {
        this.fileInput = document.getElementById('fileInput');
        this.fileList = document.getElementById('fileList');
        this.uploadForm = document.getElementById('uploadForm');
        this.uploadButton = document.getElementById('uploadButton');
        this.uploadResult = document.getElementById('uploadResult');
        this.selectedFiles = new Map();
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Обработчик выбора файлов
        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelection(e.target.files);
        });
        
        // Обработчик отправки формы
        this.uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUpload();
        });
        
        // Drag and drop функциональность
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const dropArea = document.querySelector('.file-input-label');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.highlight(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => this.unhighlight(), false);
        });
        
        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFileSelection(files);
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        document.querySelector('.file-input-label').style.backgroundColor = '#e3f2fd';
    }
    
    unhighlight() {
        document.querySelector('.file-input-label').style.backgroundColor = '#f8f9fa';
    }
    
    handleFileSelection(fileList) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        for (let file of fileList) {
            // Проверка типа файла
            if (!allowedTypes.includes(file.type)) {
                this.showError(`Файл "${file.name}" имеет недопустимый тип. Разрешены только JPG, PNG и PDF.`);
                continue;
            }
            
            // Проверка размера файла
            if (file.size > maxSize) {
                this.showError(`Файл "${file.name}" слишком большой. Максимальный размер: 10MB.`);
                continue;
            }
            
            // Добавление файла в список
            if (!this.selectedFiles.has(file.name)) {
                this.selectedFiles.set(file.name, file);
                this.addFileToList(file);
            }
        }
        
        // Сброс input для возможности выбора тех же файлов снова
        this.fileInput.value = '';
    }
    
    addFileToList(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-name">${this.escapeHtml(file.name)}</div>
                <div class="file-size">${this.formatFileSize(file.size)}</div>
            </div>
            <button type="button" class="file-remove" data-filename="${this.escapeHtml(file.name)}">
                Удалить
            </button>
        `;
        
        this.fileList.appendChild(fileItem);
        
        // Обработчик удаления файла
        const removeButton = fileItem.querySelector('.file-remove');
        removeButton.addEventListener('click', () => {
            this.removeFile(file.name);
            fileItem.remove();
        });
    }
    
    removeFile(filename) {
        this.selectedFiles.delete(filename);
    }
    
    async handleUpload() {
        if (this.selectedFiles.size === 0) {
            this.showError('Пожалуйста, выберите файлы для загрузки.');
            return;
        }
        
        this.setUploadingState(true);
        
        try {
            const formData = new FormData();
            
            // Добавляем все файлы в FormData
            for (let file of this.selectedFiles.values()) {
                formData.append('files[]', file);
            }
            
            const response = await fetch('upload.php', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showSuccess(result);
                this.clearFileList();
            } else {
                this.showError(result.message || 'Произошла ошибка при загрузке файлов.');
            }
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showError('Произошла ошибка при загрузке файлов. Проверьте подключение.');
        } finally {
            this.setUploadingState(false);
        }
    }
    
    setUploadingState(uploading) {
        const buttonText = this.uploadButton.querySelector('.button-text');
        const buttonLoading = this.uploadButton.querySelector('.button-loading');
        
        if (uploading) {
            this.uploadButton.disabled = true;
            buttonText.style.display = 'none';
            buttonLoading.style.display = 'inline';
        } else {
            this.uploadButton.disabled = false;
            buttonText.style.display = 'inline';
            buttonLoading.style.display = 'none';
        }
    }
    
    showSuccess(result) {
        this.uploadResult.className = 'upload-result success';
        let html = '<strong>Файлы успешно загружены!</strong>';
        
        if (result.files && result.files.length > 0) {
            html += '<ul>';
            result.files.forEach(file => {
                html += `<li>${this.escapeHtml(file.name)} (${this.formatFileSize(file.size)})</li>`;
            });
            html += '</ul>';
        }
        
        this.uploadResult.innerHTML = html;
    }
    
    showError(message) {
        this.uploadResult.className = 'upload-result error';
        this.uploadResult.innerHTML = `<strong>Ошибка:</strong> ${this.escapeHtml(message)}`;
    }
    
    clearFileList() {
        this.selectedFiles.clear();
        this.fileList.innerHTML = '';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    new FileUploader();
});
