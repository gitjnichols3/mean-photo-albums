import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';

import { Album } from '../../../models/album.model';
import { AlbumService } from '../../../services/album.service';

@Component({
  standalone: true,
  selector: 'app-album-create',
  templateUrl: './album-create.html',
  imports: [CommonModule, FormsModule]
})
export class AlbumCreateComponent {
  title = '';
  description = '';
  formError = '';
  isSubmitting = false;

  constructor(
    private albumService: AlbumService,
    private router: Router
  ) {}

  onSubmit(form: NgForm): void {
    this.formError = '';

    // Use Angular's form validation
    if (form.invalid) {
      form.form.markAllAsTouched();
      return;
    }

    const title = this.title.trim();
    const description = this.description.trim();

    const newAlbum: { title: string; description?: string } = {
      title,
      description: description || undefined
    };

    this.isSubmitting = true;

    this.albumService.createAlbum(newAlbum).subscribe({
      next: (created) => {
        this.isSubmitting = false;

        // If the API returns the created album with _id, navigate to details
        if (created && (created as any)._id) {
          this.router.navigate(['/albums', (created as any)._id]);
        } else {
          // Fallback: go back to album list
          this.router.navigate(['/albums']);
        }
      },
      error: (err) => {
        console.error('Error creating album', err);
        this.formError = err?.error?.message || 'Failed to create album';
        this.isSubmitting = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/albums']);
  }
}
