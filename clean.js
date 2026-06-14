const fs = require('fs');
const path = require('path');

// 要删除的目录/文件
const removeList = ['node_modules', 'dist', '.turbo', '*.tsbuildinfo'];

// 递归删除文件夹/文件
function rmAll(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetPath);
  }
}

// 匹配通配符文件
function rmGlob(pattern, baseDir = process.cwd()) {
  const files = fs.readdirSync(baseDir);
  const reg = new RegExp(pattern.replace('*', '.*'));
  files.forEach((file) => {
    if (reg.test(file)) {
      rmAll(path.join(baseDir, file));
    }
  });
}

// 清理当前目录（根目录）
function cleanRoot() {
  console.log('清理根目录...');
  removeList.forEach((item) => {
    if (item.includes('*')) {
      rmGlob(item);
    } else {
      rmAll(path.join(process.cwd(), item));
    }
  });
}

// 递归清理 apps / packages 下所有子包
function cleanWorkspaces() {
  ['apps', 'packages'].forEach((wsDir) => {
    const wsPath = path.join(process.cwd(), wsDir);
    if (!fs.existsSync(wsPath)) return;
    const subDirs = fs.readdirSync(wsPath);
    subDirs.forEach((sub) => {
      const subPath = path.join(wsPath, sub);
      if (!fs.statSync(subPath).isDirectory()) return;
      console.log(`清理 ${wsDir}/${sub} ...`);
      ['node_modules', 'dist'].forEach((dir) => {
        rmAll(path.join(subPath, dir));
      });
      rmGlob('*.tsbuildinfo', subPath);
    });
  });
}

// 执行
(async () => {
  cleanRoot();
  cleanWorkspaces();
  console.log('\n✅ 所有依赖与缓存清理完成！');
})();
