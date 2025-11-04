<?php
session_start();
header('Content-Type: application/json');

// Check if user is logged in
if (!isset($_SESSION['user_logged_in']) || $_SESSION['user_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Get authenticated session cookie
$session_id = $_SESSION['portal_session_id'] ?? '';

// Function to get course data using authenticated session
function getCourseData($session_id) {
    if (empty($session_id)) {
        return [];
    }
    
    $url = 'https://portal.ewubd.edu/api/Advising/GetAllRoutine';
    $headers = [
        'Accept: application/json, text/plain, */*',
        'User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 26_0_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1',
        'Referer: https://portal.ewubd.edu/Home/Advising',
    ];
    $cookie = "ASP.NET_SessionId=$session_id; perf_dv6Tr4n=1";

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_COOKIE => $cookie,
        CURLOPT_ENCODING => '',
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_FOLLOWLOCATION => true,
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    // If unauthorized, return error
    if ($http_code == 401 || $http_code == 403) {
        return ['error' => 'unauthorized', 'code' => $http_code];
    }

    return json_decode($response, true) ?: [];
}

$courses = getCourseData($session_id);

// If unauthorized, return error
if (isset($courses['error']) && $courses['error'] === 'unauthorized') {
    http_response_code(401);
    echo json_encode(['error' => 'Session expired']);
    exit;
}

echo json_encode($courses);
?>

