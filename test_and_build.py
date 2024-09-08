import os, shutil,sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys 
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import time
import unittest

class TestActivity(unittest.TestCase):

    def setUp(self, page = 'tests.html'):
        # Get the current directory path and append 'tests.html'
        current_dir = os.path.abspath(os.path.dirname(__file__))
        file_path = f"file:///{os.path.join(current_dir, page)}"
        driver = webdriver.Chrome()

        self.driver = driver
        self.driver.get(file_path)
        time.sleep(1)

    def app1(self):
        driver = self.driver
        # Example: Locate an element by ID and click it
        button = driver.find_element(By.ID, "app1click")
        button.click()
        button.click()
        self.assertIn("2", button.text)
        driver.find_element(By.ID, "app1reset").click()
        self.assertIn("0", button.text)


    def app2(self):
        driver = self.driver
        # Example: Locate an element by ID and click it
        text = driver.find_element(By.ID, "app2text").send_keys("test-2")
        driver.find_element(By.ID, "app2check").click()
        driver.find_element(By.ID, "app2textarea").send_keys("text-area")
        #driver.find_element(By.ID, "app2select").select_by_visible_text("opel")
        app2_text  = driver.find_element(By.ID, "app2").text
        self.assertIn("test-2", app2_text)
        self.assertIn("false", app2_text)
        self.assertIn("text-area", app2_text)
        self.assertIn("select = audi", app2_text)

    def app_css(self, app_id, initial_slide = 0.5):
        driver = self.driver
        # Example: Locate an element by ID and click it
        slider = driver.find_element(By.ID, app_id+'slider')
        slider.send_keys(Keys.ARROW_LEFT)
        value = slider.get_attribute('value')
        new_value = initial_slide - 0.1
        new_value_str = "%.1f"%new_value
        self.assertEqual(new_value_str, value)

    def app4(self):
        driver = self.driver
        # Example: Locate an element by ID and click it
        text = driver.find_element(By.ID, "app4").text
        self.assertIn("three", text)
        self.assertIn("both chexkboxes are off", text)


    def app_todo(self, app_id):
        driver = self.driver
        # Example: Locate an element by ID and click it
        text = driver.find_element(By.ID, app_id).text
        self.assertIn("delete", text)

    def app10(self):
        driver = self.driver
        # Example: Locate an element by ID and click it
        text = driver.find_element(By.ID, 'app10').text
        self.assertIn("slot default [3]", text)
        self.assertIn("slot ciao [3]", text)

    def get_version(self):
        return self.driver.execute_script('return Vuenilla.version')
    def tearDown(self):
       self.driver.quit()


def run_tests(page):
    print('running tests on',page)
    ta = TestActivity()
    ta.setUp(page)

    version = ta.get_version() 
    print(version)

    ta.app1()
    ta.app2()
    ta.app_css('app3')
    ta.app4()
    ta.app_todo('app5')
    ta.app_todo('app6')
    ta.app_css('app7') #w. watcher
    #check that we can re use logic
    ta.app_css('app8')
    ta.app_css('app9')
    #check that previous test didnt affect app9 elements
    ta.app_css('app8', initial_slide = 0.4) 
    ta.app10()
    ta.tearDown()
    print('done.')
    return version


def sed(filename, old_str, new_str):
    with open(filename, 'r') as file:
        content = file.read().replace(old_str, new_str)
    with open(filename, 'w') as file:
        file.write(content)

if __name__ == "__main__":
    continuous_integration = len(sys.argv)>1 and sys.argv[1]=='ci'
    if continuous_integration:
        import chromedriver_autoinstaller
        from pyvirtualdisplay import Display
        # Initialize the WebDriver (e.g., Chrome)
        display = Display(visible=0, size=(800, 800))  
        display.start()
        
        chromedriver_autoinstaller.install()  # Check if the current version of chromedriver exists
                                              # and if it doesn't exist, download it automatically,
                                              # then add chromedriver to path
        

    version = run_tests('tests.html')
    if not continuous_integration:
        if not os.path.exists('build'):
            os.makedirs('build')
        shutil.copyfile('vuenilla.js','build/vuenilla.js')
        shutil.copyfile('tests.html','build/tests.html')
        run_tests('build/tests.html')
        
        shutil.copyfile('vuenilla.js','build/vuenilla%s.js'%version)
        shutil.copyfile('tests.html','build/tests%s.html'%version)
        sed('build/tests%s.html'%(version),'vuenilla','vuenilla%s'%version)
        run_tests('build/tests%s.html'%version)

        os.system('minify vuenilla.js > build/vuenilla.min.js')
        shutil.copyfile('build/vuenilla.min.js','build/vuenilla%s.min.js'%version)
        shutil.copyfile('build/tests.html','build/tests%s.min.html'%version)
        sed('build/tests%s.min.html'%(version),'vuenilla','vuenilla%s.min'%version)
        run_tests('build/tests%s.min.html'%version)
