<?php
session_start();
header('Content-Type: application/json');

try {
    // Get JSON input
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username = $input['username'] ?? '';
    $password = $input['password'] ?? '';
    
    // Validate input
    if (empty($username) || empty($password)) {
        throw new Exception('Username and password are required');
    }
    
    // ===== STEP 1: Initial GET request to retrieve hidden values and session =====
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko\r\n" .
                       "Pragma: no-cache\r\n" .
                       "Accept: */*\r\n"
        ]
    ]);

    $response = file_get_contents('https://portal.ewubd.edu/', false, $context);
    
    if ($response === false) {
        throw new Exception('Failed to connect to portal. Please try again later.');
    }

    // ===== STEP 2: Parse hidden form values (FirstNo and SecondNo) =====
    preg_match('/<input type="hidden" name="FirstNo" value="([^"]+)"/', $response, $num1_match);
    preg_match('/<input type="hidden" name="SecondNo" value="([^"]+)"/', $response, $num2_match);

    $num1 = $num1_match[1] ?? '';
    $num2 = $num2_match[1] ?? '';

    if (empty($num1) || empty($num2)) {
        throw new Exception('Failed to parse portal form values');
    }

    // ===== STEP 3: Calculate sum for verification =====
    $sum = (int)$num1 + (int)$num2;

    // ===== STEP 4: Parse ASP.NET session cookie from response headers =====
    $session_id = '';
    foreach ($http_response_header as $header) {
        if (strpos($header, 'Set-Cookie:') === 0 && strpos($header, 'ASP.NET_SessionId') !== false) {
            $cookie = trim(substr($header, 11));
            $cookie_parts = explode(';', $cookie);
            $name_value = explode('=', $cookie_parts[0], 2);
            if (count($name_value) === 2) {
                $session_id = $name_value[1];
                break;
            }
        }
    }

    if (empty($session_id)) {
        throw new Exception('Failed to retrieve session cookie from portal');
    }

    // ===== STEP 5: Prepare POST data with user credentials =====
    $post_data = "Username=" . urlencode($username) . 
                 "&Password=" . urlencode($password) . 
                 "&Answer=$sum" . 
                 "&FirstNo=$num1" . 
                 "&SecondNo=$num2";

    // ===== STEP 6: Submit login POST request =====
    $login_context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n" .
                       "Cookie: ASP.NET_SessionId=$session_id\r\n" .
                       "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\r\n",
            'content' => $post_data
        ]
    ]);

    $login_response = file_get_contents('https://portal.ewubd.edu/', false, $login_context);

    if ($login_response === false) {
        throw new Exception('Login request failed. Please try again.');
    }

    // ===== STEP 7: Verify login success =====
    $result = ['status' => 'error'];
    
    if (strpos($login_response, 'View Profile') !== false) {
        // Login successful - store session data
        $_SESSION['user_logged_in'] = true;
        $_SESSION['user_id'] = $username;
        $_SESSION['portal_session_id'] = $session_id;
        $_SESSION['login_time'] = time();
        
        $result['status'] = 'success';
        $result['message'] = 'Login successful';
        
    } elseif (strpos($login_response, 'Username or password is incorrect') !== false) {
        $result['message'] = 'Username or password is incorrect';
    } elseif (strpos($login_response, 'Invalid answer') !== false) {
        $result['message'] = 'Portal verification failed. Please try again.';
    } else {
        $result['message'] = 'Could not determine login status. Please try again.';
    }
    
    echo json_encode($result);
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?>

