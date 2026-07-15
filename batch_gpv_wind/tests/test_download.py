import subprocess
import tempfile
import unittest
from pathlib import Path

from module.download import DownloadError, download_grib2


class DownloadGrib2Test(unittest.TestCase):
    def test_downloads_with_tls_verification_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "sample.bin"
            received_command: list[str] = []

            def runner(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                received_command.extend(command)
                destination.write_bytes(b"GRIB test data")
                return subprocess.CompletedProcess(command, 0, "", "")

            download_grib2("https://example.test/sample.bin", destination, runner=runner)

            self.assertNotIn("--insecure", received_command)
            self.assertIn("--fail", received_command)
            self.assertIn("--location", received_command)
            self.assertEqual(destination.read_bytes(), b"GRIB test data")

    def test_insecure_download_must_be_explicit(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "sample.bin"
            received_command: list[str] = []

            def runner(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                received_command.extend(command)
                destination.write_bytes(b"GRIB test data")
                return subprocess.CompletedProcess(command, 0, "", "")

            download_grib2(
                "https://example.test/sample.bin",
                destination,
                allow_insecure=True,
                runner=runner,
            )

            self.assertIn("--insecure", received_command)

    def test_certificate_error_is_visible_and_partial_file_is_removed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "sample.bin"

            def runner(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                destination.write_bytes(b"partial")
                return subprocess.CompletedProcess(
                    command,
                    60,
                    "",
                    "curl: (60) SSL certificate problem: unable to get local issuer certificate",
                )

            with self.assertRaisesRegex(
                DownloadError, "--allow-insecure-download"
            ) as raised:
                download_grib2(
                    "https://example.test/sample.bin", destination, runner=runner
                )

            self.assertIn("unable to get local issuer certificate", str(raised.exception))
            self.assertFalse(destination.exists())

    def test_rejects_a_non_grib_response(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            destination = Path(temporary_directory) / "sample.bin"

            def runner(command: list[str], **_: object) -> subprocess.CompletedProcess[str]:
                destination.write_text("server error", encoding="utf-8")
                return subprocess.CompletedProcess(command, 0, "", "")

            with self.assertRaisesRegex(DownloadError, "GRIB2形式"):
                download_grib2(
                    "https://example.test/sample.bin", destination, runner=runner
                )

            self.assertFalse(destination.exists())


if __name__ == "__main__":
    unittest.main()
