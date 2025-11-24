<?php
header('Content-Type: application/json');

// Настройки
$uploadDir = __DIR__ . '/uploads/';
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
$maxFileSize = 10 * 1024 * 1024; // 10MB

// Создаем директорию для загрузок, если она не существует
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$response = [
    'success' => false,
    'message' => '',
    'files' => []
];

try {
    // Проверяем метод запроса
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Метод не поддерживается');
    }

    // Проверяем наличие файлов
    if (!isset($_FILES['files']) || empty($_FILES['files']['name'][0])) {
        throw new Exception('Файлы не были отправлены');
    }

    $files = $_FILES['files'];
    $uploadedFiles = [];

    // Обрабатываем каждый файл
    for ($i = 0; $i < count($files['name']); $i++) {
        $fileName = $files['name'][$i];
        $fileTmpName = $files['tmp_name'][$i];
        $fileSize = $files['size'][$i];
        $fileError = $files['error'][$i];
        $fileType = $files['type'][$i];

        // Проверяем на ошибки загрузки
        if ($fileError !== UPLOAD_ERR_OK) {
            $errorMessage = $this->getUploadError($fileError);
            throw new Exception("Ошибка загрузки файла '{$fileName}': {$errorMessage}");
        }

        // Проверяем тип файла
        if (!in_array($fileType, $allowedTypes)) {
            throw new Exception("Файл '{$fileName}' имеет недопустимый тип");
        }

        // Проверяем размер файла
        if ($fileSize > $maxFileSize) {
            throw new Exception("Файл '{$fileName}' превышает максимальный размер 10MB");
        }

        // Генерируем безопасное имя файла
        $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
        $safeFileName = $this->generateSafeFileName($fileName, $fileExtension);
        $uploadPath = $uploadDir . $safeFileName;

        // Проверяем, не существует ли файл с таким именем
        if (file_exists($uploadPath)) {
            $safeFileName = $this->generateUniqueFileName($safeFileName, $uploadDir);
            $uploadPath = $uploadDir . $safeFileName;
        }

        // Перемещаем файл в целевую директорию
        if (!move_uploaded_file($fileTmpName, $uploadPath)) {
            throw new Exception("Не удалось сохранить файл '{$fileName}'");
        }

        // Добавляем информацию о загруженном файле в ответ
        $uploadedFiles[] = [
            'originalName' => $fileName,
            'savedName' => $safeFileName,
            'size' => $fileSize,
            'type' => $fileType
        ];
    }

    $response['success'] = true;
    $response['message'] = 'Файлы успешно загружены';
    $response['files'] = $uploadedFiles;

} catch (Exception $e) {
    $response['success'] = false;
    $response['message'] = $e->getMessage();
}

// Возвращаем JSON ответ
echo json_encode($response, JSON_UNESCAPED_UNICODE);

/**
 * Генерирует безопасное имя файла
 */
function generateSafeFileName($originalName, $extension) {
    $nameWithoutExt = pathinfo($originalName, PATHINFO_FILENAME);
    $safeName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $nameWithoutExt);
    $safeName = substr($safeName, 0, 100); // Ограничиваем длину имени
    return $safeName . '_' . time() . '.' . $extension;
}

/**
 * Генерирует уникальное имя файла если файл с таким именем уже существует
 */
function generateUniqueFileName($fileName, $uploadDir) {
    $fileInfo = pathinfo($fileName);
    $counter = 1;
    
    while (file_exists($uploadDir . $fileName)) {
        $fileName = $fileInfo['filename'] . '_' . $counter . '.' . $fileInfo['extension'];
        $counter++;
    }
    
    return $fileName;
}

/**
 * Возвращает описание ошибки загрузки файла
 */
function getUploadError($errorCode) {
    switch ($errorCode) {
        case UPLOAD_ERR_INI_SIZE:
            return 'Размер файла превышает разрешенный директивой upload_max_filesize';
        case UPLOAD_ERR_FORM_SIZE:
            return 'Размер файла превышает разрешенный значением MAX_FILE_SIZE в форме';
        case UPLOAD_ERR_PARTIAL:
            return 'Файл был загружен только частично';
        case UPLOAD_ERR_NO_FILE:
            return 'Файл не был загружен';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'Отсутствует временная директория';
        case UPLOAD_ERR_CANT_WRITE:
            return 'Не удалось записать файл на диск';
        case UPLOAD_ERR_EXTENSION:
            return 'Расширение PHP остановило загрузку файла';
        default:
            return 'Неизвестная ошибка';
    }
}