<?php
// We use the session generating temporary filenames.
session_start();

// Make sure these directories are writable by the user which owns the webserver
// process
$TEMP_FILE_UPLOAD_PATH = "/tmp";
$PERM_FILE_UPLOAD_PATH = "/www/yggdrasil.group/fileupload/htdocs/files";

function success_true($data = false) {
	header('Content-Type: application/json');
	$res = array('success' => true);
	if ($data) {
		$res['data'] = $data;
	}
	die(json_encode($res));
}
function success_false($msg = false) {
	header('Content-Type: application/json');
	$data = array('success' => false);
	if ($msg) {
		$data['msg'] = $msg;
	}
	die(json_encode($data));
}

function decode_chunk( $data ) {
	$data = explode( ';base64,', $data );
	if ( ! is_array( $data ) || ! isset( $data[1] ) ) {
		return false;
	}
	$data = base64_decode( $data[1] );
	if ( ! $data ) {
		return false;
	}
	return $data;
}

if (isset($_POST['fileChunk']) === false) {
	success_false("No file supplied.");
}

$fileChunk = decode_chunk($_POST['fileChunk']);

if ($fileChunk === false) {
	success_false("File was not correctly encoded, before sending to the server");
}

$fileName = $_SERVER['HTTP_X_FILE_NAME'];
$fileExtension = pathinfo($fileName, PATHINFO_EXTENSION);

if (isset($_POST['fileHash']) && !empty($_POST['fileHash'])) {
	$fileHash = $_POST['fileHash'];
} else {
	$fileHash = hash('sha512', session_id() . ' ' . time() . ' ' . $fileName);
}

$fileHashedName = $fileHash . '.' .$fileExtension;
$fileSize = $_SERVER['HTTP_X_FILE_SIZE'];
$fileChunksCurrent = $_SERVER['HTTP_X_FILE_CHUNKS_CURRENT'];
$fileChunksTotal = $_SERVER['HTTP_X_FILE_CHUNKS_TOTAL'];
$filePathTemp = "$TEMP_FILE_UPLOAD_PATH/$fileHashedName.ChunkyUpload";
$filePathFinal = "$PERM_FILE_UPLOAD_PATH/$fileName";

if (file_put_contents($filePathTemp, $fileChunk, FILE_APPEND) === false) {
	success_false("Could not append to file $filePathTemp.");
}

// all chunks combined
if ($fileChunksCurrent === $fileChunksTotal) {
	if (rename($filePathTemp, $filePathFinal) === false) {
		unlink($filePathTemp.".tmpupload");
		success_false("Could not rename $filePath.tmpupload to $filePathFinal.");
	}
	// Do something with the file and data
} else {
	success_true(array('fileHash' => $fileHash));
}
?>
