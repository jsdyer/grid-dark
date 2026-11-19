"""Exercise the built starter at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "example-tool")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                url=f"http://127.0.0.1:{server.server_port}/example-tool/"
                page.goto(url)
                page.wait_for_selector("#results:visible")
                assert page.locator("#low").inner_text()=="46.0%"
                assert page.locator("#rows tr").count()==4
                page.select_option("#metric","bgp")
                assert page.locator("#low").inner_text()=="93.4%"
                page.select_option("#event","island")
                assert page.locator("#rows tr").count()==6
                page.locator("#rows button").first.click()
                assert page.locator("#hour").input_value()!="0"
                page.select_option("#zone","utc")
                with page.expect_download() as saved: page.click("#download")
                assert saved.value.suggested_filename=="grid-dark-island.csv"
                for recent in ["recent-fiona","recent-island"]:
                    page.select_option("#event",recent)
                    assert "no matched utility bulletins" in page.locator("#power").inner_text()
                    assert int(page.locator("#dailySummary").inner_text().split()[0])>=1
                page.screenshot(path=str(screenshots / "desktop.png"))
                page.set_viewport_size({"width":390,"height":844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"))
                assert not errors, errors
                browser.close()
            print("Browser checks passed: project subpath, source data, interactive filters, CSV and mobile layout")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
