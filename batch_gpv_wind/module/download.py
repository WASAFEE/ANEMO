import subprocess
from collections.abc import Callable
from pathlib import Path


CommandRunner = Callable[..., subprocess.CompletedProcess[str]]


class DownloadError(RuntimeError):
    """Raised when a GRIB2 file cannot be downloaded or validated."""


def _validate_grib2(path: Path) -> None:
    try:
        with path.open("rb") as downloaded_file:
            signature = downloaded_file.read(4)
    except OSError as exc:
        raise DownloadError(f"ダウンロードしたファイルを読み取れません: {exc}") from exc

    if signature != b"GRIB":
        path.unlink(missing_ok=True)
        raise DownloadError(
            "取得したファイルがGRIB2形式ではありません。"
            "配布サーバーのエラーページを保存した可能性があります。"
        )


def download_grib2(
    url: str,
    destination: Path,
    *,
    allow_insecure: bool = False,
    runner: CommandRunner = subprocess.run,
) -> None:
    """Download and minimally validate a GRIB2 file.

    TLS certificate verification is enabled by default.  The insecure mode is
    deliberately opt-in because these wind data must not be silently accepted
    from an unauthenticated endpoint.
    """

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.unlink(missing_ok=True)

    command: list[str] = ["curl"]
    if allow_insecure:
        command.append("--insecure")
    command.extend(
        [
            "--fail",
            "--location",
            "--show-error",
            "--silent",
            "--output",
            str(destination),
            url,
        ]
    )

    result = runner(command, capture_output=True, text=True)
    if result.returncode != 0:
        destination.unlink(missing_ok=True)
        detail = result.stderr.strip() or f"curl終了コード: {result.returncode}"
        hint = ""
        if result.returncode == 60 or "certificate" in detail.lower():
            hint = (
                "\n配布サーバー側のTLS証明書を検証できません。"
                "URLと取得元を確認し、リスクを理解して一時的に続行する場合だけ "
                "`uv run main.py --allow-insecure-download` を使用してください。"
            )
        raise DownloadError(f"ファイルのダウンロードに失敗しました。\n{detail}{hint}")

    _validate_grib2(destination)
