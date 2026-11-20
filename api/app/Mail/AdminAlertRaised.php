<?php

namespace App\Mail;

use App\Models\AdminAlert;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminAlertRaised extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public AdminAlert $alert) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "[Alerte] {$this->alert->title}");
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.admin-alert-raised',
            with: [
                'title' => $this->alert->title,
                'body' => $this->alert->body,
                // Withdrawals under review are settled from Finance; everything else is listed
                // with the alerts themselves.
                'path' => $this->alert->type === AdminAlert::WITHDRAWAL_NEEDS_REVIEW ? '/finances' : '/',
            ],
        );
    }
}
