#!/usr/bin/env python3
"""
Photo Collector - Automated Test Runner
Tests the web application functionality without requiring a browser.
"""

import urllib.request
import json
import re
import sys
from urllib.error import URLError, HTTPError

class PhotoCollectorTester:
    def __init__(self, base_url="http://127.0.0.1:8001"):
        self.base_url = base_url
        self.passed_tests = 0
        self.failed_tests = 0

    def test_url(self, path, expected_content=None, description=""):
        """Test if a URL is accessible and optionally contains expected content."""
        try:
            full_url = f"{self.base_url}{path}"
            response = urllib.request.urlopen(full_url, timeout=10)

            if response.getcode() == 200:
                content = response.read().decode('utf-8')

                if expected_content:
                    if isinstance(expected_content, list):
                        all_found = all(item in content for item in expected_content)
                        if all_found:
                            self.log_pass(f"PASS {description}: All expected content found")
                            return True
                        else:
                            missing = [item for item in expected_content if item not in content]
                            self.log_fail(f"FAIL {description}: Missing content: {missing}")
                            return False
                    else:
                        if expected_content in content:
                            self.log_pass(f"PASS {description}: Expected content found")
                            return True
                        else:
                            self.log_fail(f"FAIL {description}: Expected content not found")
                            return False
                else:
                    self.log_pass(f"PASS {description}: URL accessible")
                    return True
            else:
                self.log_fail(f"FAIL {description}: HTTP {response.getcode()}")
                return False

        except Exception as e:
            self.log_fail(f"FAIL {description}: {str(e)}")
            return False

    def test_html_structure(self):
        """Test the main HTML file structure."""
        print("\n=== HTML Structure Tests ===")

        required_elements = [
            'id="cameraBtn"',
            'id="uploadBtn"',
            'id="fileInput"',
            'id="cameraContainer"',
            'id="cameraVideo"',
            'id="captureBtn"',
            'id="closeCameraBtn"',
            'id="previewSection"',
            'id="previewImage"',
            'id="removeImageBtn"',
            'id="description"',
            'id="uploadToS3Btn"',
            'id="progressContainer"',
            'id="progressFill"',
            'id="progressText"',
            'id="messageContainer"',
            'id="s3Bucket"',
            'id="s3Region"',
            'id="s3AccessKey"',
            'id="s3SecretKey"'
        ]

        return self.test_url('/', required_elements, "Main HTML structure")

    def test_css_structure(self):
        """Test CSS file contains required styles."""
        print("\n=== CSS Structure Tests ===")

        required_styles = [
            '.primary-btn',
            '.secondary-btn',
            '.upload-btn',
            '.capture-btn',
            '.camera-container',
            '.preview-image',
            '.progress-bar',
            '.message',
            '@media (max-width: 480px)',
            '@media (hover: none) and (pointer: coarse)'
        ]

        return self.test_url('/style.css', required_styles, "CSS structure")

    def test_javascript_structure(self):
        """Test JavaScript file contains required classes and methods."""
        print("\n=== JavaScript Structure Tests ===")

        required_js_elements = [
            'class PhotoCollector',
            'constructor()',
            'initializeElements()',
            'attachEventListeners()',
            'openCamera()',
            'capturePhoto()',
            'handleFileSelect(',
            'uploadToS3()',
            'initializeS3()',
            'validateS3Config()',
            'showMessage(',
            'checkBrowserSupport(',
            'cleanup()'
        ]

        return self.test_url('/script.js', required_js_elements, "JavaScript structure")

    def test_all_pages(self):
        """Test all HTML pages are accessible."""
        print("\n=== Page Accessibility Tests ===")

        pages = {
            '/': '<title>Photo Collector</title>',
            '/test.html': 'Browser Compatibility Tests',
            '/test-s3.html': 'S3 Upload Functionality Tests',
            '/test-mobile.html': 'Mobile Responsiveness Test',
            '/debug-test.html': 'Photo Collector Debug Test',
            '/create-test-image.html': 'Test Image Generator'
        }

        all_passed = True
        for path, expected_content in pages.items():
            if not self.test_url(path, expected_content, f"Page {path}"):
                all_passed = False

        return all_passed

    def test_security_headers(self):
        """Test for basic security considerations."""
        print("\n=== Security Tests ===")

        try:
            response = urllib.request.urlopen(f"{self.base_url}/", timeout=10)

            # Check if HTTPS is used (will be false for localhost testing)
            if self.base_url.startswith('https'):
                self.log_pass("PASS HTTPS used")
            else:
                self.log_info("INFO HTTP used (OK for localhost testing)")

            # Check for AWS SDK loading
            content = response.read().decode('utf-8')
            if 'aws-sdk' in content:
                self.log_pass("PASS AWS SDK loaded from CDN")

            return True

        except Exception as e:
            self.log_fail(f"FAIL Security test failed: {str(e)}")
            return False

    def test_error_handling(self):
        """Test error handling in JavaScript."""
        print("\n=== Error Handling Tests ===")

        try:
            response = urllib.request.urlopen(f"{self.base_url}/script.js", timeout=10)
            js_content = response.read().decode('utf-8')

            error_handling_patterns = [
                r'try\s*{',
                r'catch\s*\(',
                r'throw\s+new\s+Error',
                r'\.showMessage\(',
                r'console\.error\(',
                r'finally\s*{'
            ]

            all_found = True
            for pattern in error_handling_patterns:
                if not re.search(pattern, js_content):
                    self.log_fail(f"FAIL Error handling pattern not found: {pattern}")
                    all_found = False

            if all_found:
                self.log_pass("PASS Error handling patterns found")

            # Check for specific error scenarios
            error_scenarios = [
                'Camera access error',
                'S3 upload error',
                'File selection error',
                'Network',
                'Invalid'
            ]

            scenarios_found = 0
            for scenario in error_scenarios:
                if scenario.lower() in js_content.lower():
                    scenarios_found += 1

            if scenarios_found >= 4:
                self.log_pass(f"PASS Error scenarios covered: {scenarios_found}/5")
            else:
                self.log_fail(f"FAIL Limited error scenarios: {scenarios_found}/5")

            return all_found and scenarios_found >= 4

        except Exception as e:
            self.log_fail(f"FAIL Error handling test failed: {str(e)}")
            return False

    def test_mobile_responsiveness(self):
        """Test mobile responsiveness in CSS."""
        print("\n=== Mobile Responsiveness Tests ===")

        try:
            response = urllib.request.urlopen(f"{self.base_url}/style.css", timeout=10)
            css_content = response.read().decode('utf-8')

            mobile_features = [
                '@media (max-width: 480px)',
                'min-height: 60px',
                'min-height: 64px',
                'width: 88px',
                'height: 88px',
                'touch',
                'viewport'
            ]

            features_found = 0
            for feature in mobile_features:
                if feature in css_content:
                    features_found += 1

            if features_found >= 5:
                self.log_pass(f"PASS Mobile features found: {features_found}/7")
                return True
            else:
                self.log_fail(f"FAIL Limited mobile features: {features_found}/7")
                return False

        except Exception as e:
            self.log_fail(f"FAIL Mobile responsiveness test failed: {str(e)}")
            return False

    def log_pass(self, message):
        """Log a passed test."""
        print(f"  {message}")
        self.passed_tests += 1

    def log_fail(self, message):
        """Log a failed test."""
        print(f"  {message}")
        self.failed_tests += 1

    def log_info(self, message):
        """Log an info message."""
        print(f"  {message}")

    def run_all_tests(self):
        """Run all tests and return summary."""
        print("Photo Collector - Automated Test Suite")
        print("=" * 50)

        tests = [
            self.test_html_structure,
            self.test_css_structure,
            self.test_javascript_structure,
            self.test_all_pages,
            self.test_security_headers,
            self.test_error_handling,
            self.test_mobile_responsiveness
        ]

        for test in tests:
            try:
                test()
            except Exception as e:
                self.log_fail(f"Test failed with exception: {str(e)}")

        # Summary
        print("\n" + "=" * 50)
        print(f"TEST SUMMARY")
        print("=" * 50)
        print(f"Passed: {self.passed_tests}")
        print(f"Failed: {self.failed_tests}")
        print(f"Total:  {self.passed_tests + self.failed_tests}")

        success_rate = (self.passed_tests / (self.passed_tests + self.failed_tests)) * 100 if (self.passed_tests + self.failed_tests) > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")

        if self.failed_tests == 0:
            print("\nALL TESTS PASSED! The web app is ready.")
            return True
        else:
            print(f"\n{self.failed_tests} tests failed. Please review the issues above.")
            return False

if __name__ == "__main__":
    tester = PhotoCollectorTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)