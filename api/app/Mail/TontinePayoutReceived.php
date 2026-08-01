<?php

namespace App\Mail;

use App\Models\Group;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TontinePayoutReceived extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $recipient,
        public Group $group,
        public float $amount,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Vous avez reçu un versement de « {$this->group->name} »",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'emails.tontine-payout-received',
            with: [
                'recipientName' => $this->recipient->name,
                'groupName' => $this->group->name,
                'amount' => number_format($this->amount, 0, ',', ' ').' FCFA',
            ],
        );
    }
}
