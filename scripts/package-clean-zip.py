import os
import zipfile

def create_clean_zip(output_path='/tmp/spendsense-project.zip'):
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    exclude_dirs = {'node_modules', 'dist', '.git', '.cache'}
    exclude_exts = ('.zip', '.tar.gz', '.tar', '.tgz')
    artifact_dir = '/.aistudio/artifacts/brain/40e862c2-57cf-416f-bb07-2b3afabc641f'
    os.makedirs(artifact_dir, exist_ok=True)
    artifact_zip = os.path.join(artifact_dir, 'spendsense-project.zip')

    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            for file in files:
                if (file.startswith('.env') and file != '.env.example') or file.endswith(exclude_exts):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, root_dir)
                z.write(full_path, rel_path)

    # Validate archive integrity
    with zipfile.ZipFile(output_path, 'r') as z:
        assert z.testzip() is None, "ZIP integrity test failed"
        names = z.namelist()
        assert not any(n == '.env' or n.endswith('/.env') or (n.startswith('.env') and n != '.env.example') for n in names), "Security check failed: .env found in zip"
        assert any(n == '.env.example' for n in names), "Verification failed: .env.example missing"
        print(f"Clean archive created at {output_path} ({len(names)} files, {os.path.getsize(output_path)} bytes)")

    import shutil
    shutil.copyfile(output_path, artifact_zip)
    print(f"Clean archive copied to artifact location: {artifact_zip}")

if __name__ == '__main__':
    create_clean_zip()
